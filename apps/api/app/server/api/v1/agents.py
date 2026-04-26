# app/server/api/v1/agents.py
import json
import asyncio
from fastapi import APIRouter, Depends, Request, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.server.deps import get_db, SessionLocal
from app.common.response import success_response
from app.domain.schemas.agent import AgentRunRequest, AgentTemplateCreate, AgentTemplateUpdate
from app.application.services.agent_service import AgentService
from app.application.services.agent_template_service import AgentTemplateService
from app.application.services.workflow_service import WorkflowService
from app.application.agent_framework.compiler import WorkflowCompiler

router = APIRouter()

@router.get("/templates", summary="获取智能体模板列表")
def list_agent_templates(request: Request, db: Session = Depends(get_db)):
    templates = AgentTemplateService.list(db)
    return success_response(
        data=[AgentTemplateService.to_api_data(item) for item in templates],
        trace_id=request.state.trace_id,
    )

@router.post("/templates", summary="创建智能体模板")
def create_agent_template(body: AgentTemplateCreate, request: Request, db: Session = Depends(get_db)):
    template = AgentTemplateService.create(db, body)
    return success_response(
        data=AgentTemplateService.to_api_data(template),
        trace_id=request.state.trace_id,
    )

@router.get("/templates/{template_id}", summary="获取智能体模板详情")
def get_agent_template(template_id: str, request: Request, db: Session = Depends(get_db)):
    template = AgentTemplateService.get(db, template_id)
    return success_response(
        data=AgentTemplateService.to_api_data(template),
        trace_id=request.state.trace_id,
    )

@router.put("/templates/{template_id}", summary="更新智能体模板")
def update_agent_template(template_id: str, body: AgentTemplateUpdate, request: Request, db: Session = Depends(get_db)):
    template = AgentTemplateService.update(db, template_id, body)
    return success_response(
        data=AgentTemplateService.to_api_data(template),
        trace_id=request.state.trace_id,
    )

@router.delete("/templates/{template_id}", summary="删除智能体模板")
def delete_agent_template(template_id: str, request: Request, db: Session = Depends(get_db)):
    AgentTemplateService.delete(db, template_id)
    return success_response(data={"message": "Agent template deleted"}, trace_id=request.state.trace_id)

@router.post("/run", summary="同步执行智能体工作流")
async def run_agent(body: AgentRunRequest, request: Request, db: Session = Depends(get_db)):
    """
    传入工作流 ID 与用户输入，同步等待整个图网络执行完毕并返回最终推演结果,并保存历史记录。适用于耗时较短的任务:
    1. 根据 workflow_id 获取最新图纸 JSON
    2. 动态编译 LangGraph 引擎
    3. 运行并返回最优点（Best Node）的输出

    输入参数:
    - workflow_id: 工作流ID
    - session_name: 会话名称
    - user_input: 用户输入
    - project_id (可选): 项目ID，关联会话到特定项目
    
    输出参数:
    - session_id: 会话ID
    - project_id: 项目ID
    - workflow_id: 工作流ID
    - session_name: 会话名称
    - status: 执行状态，固定为"completed"
    - user_input: 用户输入
    - final_output: 最终输出结果
    - execution_history: 执行历史记录
    """
    session_record = AgentService.create_session(
        db=db, 
        session_name=body.session_name or "未命名推演", 
        user_input=body.user_input,
        project_id=body.project_id   
    )

    # 1. 根据前端传来的 ID，从数据库拿取最新的 JSON 图纸
    workflow_record = WorkflowService.get(db, body.workflow_id)
    # 2. 实例化编译器，传入模板进行编译
    compiler = WorkflowCompiler(db=db, workflow_json=workflow_record.graph_config)
    app_graph = compiler.compile()
    # 3. 构造初始状态并异步执行 LangGraph 引擎
    initial_state = {
        "input": body.user_input, 
        "history": [], 
        "context": body.payload or {}
    }
    try:
        result = await app_graph.ainvoke(initial_state)
        # 4. 获取管家记录的最终结果 (回溯最高分或取最后一个节点)
        best_node = compiler.state_manager.get_best_node()
        if best_node and best_node.draft_content:
            final_output = best_node.draft_content
        else:
            history = result.get("history", [])
            final_output = "引擎执行完毕，但无输出。"
            if history:
                # 倒序寻找最后一个 generator 的输出
                for item in reversed(history):
                    if item.get("role") == "generator":
                        final_output = item.get("content", "")
                        break
                # 兜底机制
                if final_output == "引擎执行完毕，但无输出。":
                    final_output = history[-1].get("content", "无内容")

        AgentService.update_session(
            db=db,
            session_id=session_record.id,
            status="completed",
            final_output=final_output,
            context_snapshot={"execution_history": result["history"]} # 把整个推演过程存进去
        )

        return success_response(
            data={
                "session_id": session_record.id,
                "session_name": session_record.session_name,
                "project_id": session_record.project_id,
                "workflow_id": body.workflow_id,
                "status": "completed",
                "user_input": body.user_input,
                "final_output": final_output,
                "execution_history": result["history"] # 返回完整的推演流供前端展示
            },
            trace_id=request.state.trace_id,
        )
    except Exception as e:
        # 5. 引擎崩溃兜底：更新数据库记录 (状态: failed)
        AgentService.update_session(
            db=db,
            session_id=session_record.id,
            status="failed",
            final_output=f"执行崩溃: {str(e)}"
        )
        raise e

@router.post("/run-async", summary="异步(后台)执行智能体工作流")
async def run_agent_async(
    body: AgentRunRequest, 
    request: Request, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    """
    适用于极其耗时（如10分钟以上）的长链推演：
    1. 立刻在数据库创建会话记录，状态标记为 running
    2. 立刻向前端返回 200 OK 和 session_id
    3. 将耗时的大模型推演丢入 FastAPI 后台独立线程执行
    
    输入参数:
    - workflow_id: 工作流ID
    - session_name: 会话名称
    - user_input: 用户输入
    - project_id (可选): 项目ID，关联会话到特定项目
    
    输出参数:
    - session_id: 会话ID
    - project_id: 项目ID
    - workflow_id: 工作流ID
    - session_name: 会话名称
    - status: 执行状态，固定为"running"
    - msg: 提示信息
    """
    # 1. 创建会话，立即返回给前端
    session_record = AgentService.create_session(
        db=db, 
        session_name=body.session_name or "后台异步推演", 
        user_input=body.user_input,
        project_id=body.project_id
    )
    # 标记为运行中
    AgentService.update_session(db=db, session_id=session_record.id, status="running")

    # 2. 定义后台执行的闭包函数 (🚨 极其重要：必须使用独立的 DB Session)
    async def process_agent_in_background(session_id: int, workflow_id: str, user_input: str):
        # 重新获取独立的数据库连接，防止主线程连接关闭导致后台操作全部报错！
        bg_db = SessionLocal() 
        try:
            workflow_record = WorkflowService.get(bg_db, workflow_id)
            compiler = WorkflowCompiler(db=bg_db, workflow_json=workflow_record.graph_config)
            app_graph = compiler.compile()

            initial_state = {"input": user_input, "history": [], "context": {}}
            # 在后台慢慢悠悠地跑大模型，哪怕跑半个小时都不怕断连
            result = await app_graph.ainvoke(initial_state)

            best_node = compiler.state_manager.get_best_node()
            if best_node and best_node.draft_content:
                final_output = best_node.draft_content
            else:
                history = result.get("history", [])
                final_output = "引擎执行完毕，但无输出。"
                if history:
                    for item in reversed(history):
                        if item.get("role") == "generator":
                            final_output = item.get("content", "")
                            break
                    if final_output == "引擎执行完毕，但无输出。":
                        final_output = history[-1].get("content", "无内容")

            # 跑完更新状态为 completed
            AgentService.update_session(
                db=bg_db,
                session_id=session_id,
                status="completed",
                final_output=final_output,
                context_snapshot={"execution_history": result["history"]}
            )
        except Exception as e:
            # 引擎崩溃兜底：更新状态为 failed
            AgentService.update_session(
                db=bg_db,
                session_id=session_id,
                status="failed",
                final_output=f"异步执行崩溃: {str(e)}"
            )
        finally:
            # 养成好习惯：后台任务跑完，必须手动关闭这个独立的 DB 连接
            bg_db.close()

    # 3. 将任务丢入后台队列
    background_tasks.add_task(
        process_agent_in_background,
        session_id=session_record.id,
        workflow_id=body.workflow_id,
        user_input=body.user_input
    )

    # 4. 毫秒级响应前端
    return success_response(
        data={
            "session_id": session_record.id,
            "session_name": session_record.session_name,
            "project_id": session_record.project_id,
            "workflow_id": body.workflow_id,            
            "status": "running",
            "msg": "已成功加入后台执行队列，请通过 /sessions/{session_id} 接口轮询获取结果"
        },
        trace_id=request.state.trace_id,
    )

@router.post("/stream", summary="流式执行智能体工作流 (SSE)")
async def stream_agent(body: AgentRunRequest, request: Request, db: Session = Depends(get_db)):
    # TODO: 会有网络底层断连报错，待排查原因
    """
    通过 Server-Sent Events (SSE) 技术，实时向前端推送节点流转状态、大模型思考过程及中间产物,并保存历史记录：

    输入参数:
    - workflow_id: 工作流ID
    - session_name: 会话名称
    - user_input: 用户输入
    - project_id (可选): 项目ID，关联会话到特定项目
    
    输出参数:
    - SSE事件流: 实时推送的事件数据，包括：
      - 运行中事件: {"node_id": "节点ID", "status": "running", "content_preview": "内容预览", "decision": "决策"}
      - 完成事件: {"node_id": "end", "status": "completed", "final_output": "最终输出"}
      - 错误事件: {"node_id": "error", "status": "failed", "message": "错误信息"}
    """
    session_record = AgentService.create_session(
        db=db, 
        session_name=body.session_name or "流式推演", 
        user_input=body.user_input,
        project_id=body.project_id
    )

    workflow_record = WorkflowService.get(db, body.workflow_id)
    compiler = WorkflowCompiler(db=db, workflow_json=workflow_record.graph_config)
    app_graph = compiler.compile()

    async def event_generator():
        initial_state = {
            "input": body.user_input, 
            "history": [], 
            "context": {}
        }
        latest_history = []
        final_output = "无有效输出"
        final_status = "completed"
        
        try:
            async for output in app_graph.astream(initial_state, stream_mode="updates"):
                for node_id, state_update in output.items():
                    # 安全地提取 history，防止空列表报错
                    if "history" in state_update:
                        latest_history = state_update["history"]
                    
                    history_update = state_update.get("history", [])
                    latest_content = ""
                    if history_update and len(history_update) > 0:
                        last_msg = history_update[-1]
                        latest_content = last_msg.get("content", "") if isinstance(last_msg, dict) else getattr(last_msg, "content", str(last_msg))
                            
                    decision = state_update.get("context", {}).get("router_decision", "")
                    
                    payload = {
                        "node_id": node_id,
                        "status": "running",
                        "content_preview": latest_content[:100] + "..." if latest_content else "",
                        "decision": decision
                    }
                    yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.05)

            best_node = compiler.state_manager.get_best_node()
            if best_node and best_node.draft_content and not best_node.draft_content.strip().startswith('{'):
                final_output = best_node.draft_content
            elif latest_history:
                for item in reversed(latest_history):
                    content = item.get("content", "") if isinstance(item, dict) else getattr(item, "content", str(item))
                    role = item.get("role", "") if isinstance(item, dict) else getattr(item, "type", "")
                    if role in ["generator", "ai"] and not content.strip().startswith('{'):
                        final_output = content
                        break
            
            yield f"data: {json.dumps({'node_id': 'end', 'status': 'completed', 'final_output': final_output}, ensure_ascii=False)}\n\n"

        except Exception as e:
            final_status = "failed"
            error_msg = str(e)
            if "peer closed connection" in error_msg.lower() or "chunked read" in error_msg.lower():
                error_msg = "大模型API网络连接异常断开，请稍后重试或精简输入上下文。"
            final_output = error_msg
            yield f"data: {json.dumps({'node_id': 'error', 'status': 'failed', 'message': error_msg}, ensure_ascii=False)}\n\n"
            
        finally:
            with SessionLocal() as bg_db:
                # 转换 History 为 JSON 可序列化格式
                serializable_history = []
                for msg in latest_history:
                    if isinstance(msg, dict):
                        serializable_history.append(msg)
                    else:
                        serializable_history.append({"role": getattr(msg, "type", "unknown"), "content": getattr(msg, "content", "")})
                
                AgentService.update_session(
                    db=bg_db, 
                    session_id=session_record.id, 
                    status=final_status, 
                    final_output=final_output,
                    context_snapshot={"execution_history": serializable_history} 
                )
                
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/sessions", summary="获取历史会话列表")
def list_sessions(
    request: Request, 
    project_id: int = Query(..., description="必须传入项目ID进行数据隔离"), 
    limit: int = 20, 
    offset: int = 0, 
    db: Session = Depends(get_db)
):
    """
    分页获取当前用户的推演历史会话（常用于前端左侧边栏渲染）：

    输入参数:
    - project_id: 项目ID，必须传入进行数据隔离
    - limit (可选): 返回数量限制，默认20
    - offset (可选): 偏移量，默认0
    
    输出参数:
    - 返回会话列表，包含 session_id, session_name, status
    """
    sessions = AgentService.list_sessions(db, project_id=project_id, limit=limit, offset=offset)
    return success_response(
        data=[{"session_id": s.id, "session_name": s.session_name, "status": s.status} for s in sessions], 
        trace_id=request.state.trace_id
    )

@router.get("/sessions/{session_id}", summary="获取单次会话详情与调用链")
def get_session(session_id: int, request: Request, db: Session = Depends(get_db)):
    """
    获取特定会话的完整上下文，包括底层所有的工具/技能调用记录（Skill Calls）：

    输入参数:
    - session_id: 会话ID
    """
    session = AgentService.get_session(db, session_id)
    calls = AgentService.list_calls(db, session_id)
    return success_response(
        data={
            "session_id": session.id,
            "session_name": session.session_name,
            "project_id": session.project_id,
            "status": session.status,
            "user_input": session.user_input,
            "final_output": session.final_output,
            "context_snapshot": session.context_snapshot,
            "calls": [
                {
                    "call_id": call.id,
                    "skill_id": call.skill_id,
                    "call_order": call.call_order,
                    "status": call.status,
                    "input_payload": call.input_payload,
                    "output_payload": call.output_payload,
                }
                for call in calls
            ],
        },
        trace_id=request.state.trace_id,
    )
