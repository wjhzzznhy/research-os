from __future__ import annotations

import hashlib
import uuid
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.common.exceptions import BizException
from app.domain.models.agent_template import AgentTemplate
from app.domain.models.workflow import Workflow
from app.domain.schemas.agent import AgentTemplateCreate, AgentTemplateUpdate, StudioWorkflow, StudioWorkflowEdge, StudioWorkflowNode
from app.repositories.agent_template_repository import AgentTemplateRepository


class AgentTemplateService:
    @staticmethod
    def list(db: Session) -> list[AgentTemplate]:
        return AgentTemplateRepository.list(db)

    @staticmethod
    def get(db: Session, template_id: str) -> AgentTemplate:
        template = AgentTemplateRepository.get(db, template_id)
        if not template:
            raise BizException(40406, f"智能体模板 {template_id} 不存在", 404)
        return template

    @staticmethod
    def create(db: Session, data: AgentTemplateCreate) -> AgentTemplate:
        template_id = data.id or f"agent-{uuid.uuid4().hex}"
        if AgentTemplateRepository.get(db, template_id):
            raise BizException(40901, f"智能体模板 {template_id} 已存在", 409)

        values = AgentTemplateService._payload_to_model_values(template_id, data)
        template = AgentTemplate(**values)
        saved = AgentTemplateRepository.create(db, template)
        AgentTemplateService._upsert_workflow(db, saved)
        db.refresh(saved)
        return saved

    @staticmethod
    def update(db: Session, template_id: str, data: AgentTemplateUpdate) -> AgentTemplate:
        template = AgentTemplateService.get(db, template_id)
        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        values: dict[str, Any] = {}

        field_map = {
            "system_prompt": "system_prompt",
            "max_tokens": "max_tokens",
        }
        for key, value in update_data.items():
            target_key = field_map.get(key, key)
            if target_key == "workflow" and value is not None:
                values[target_key] = AgentTemplateService._dump_workflow(data.workflow)
            elif target_key == "skills" and value is not None:
                values[target_key] = [skill.model_dump() for skill in data.skills or []]
            else:
                values[target_key] = value

        updated = AgentTemplateRepository.update(db, template, values)
        AgentTemplateService._upsert_workflow(db, updated)
        db.refresh(updated)
        return updated

    @staticmethod
    def delete(db: Session, template_id: str) -> None:
        template = AgentTemplateService.get(db, template_id)
        workflow = db.query(Workflow).filter(Workflow.id == template.workflow_id).first()
        AgentTemplateRepository.delete(db, template)
        if workflow and not workflow.is_system:
            db.delete(workflow)
            db.commit()

    @staticmethod
    def to_api_data(template: AgentTemplate) -> dict[str, Any]:
        updated = template.updated_at or template.created_at
        last_modified = updated.date().isoformat() if updated else date.today().isoformat()
        return {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "icon": template.icon,
            "color": template.color,
            "role": template.role,
            "systemPrompt": template.system_prompt,
            "model": template.model,
            "temperature": template.temperature,
            "maxTokens": template.max_tokens,
            "status": template.status,
            "skills": template.skills or [],
            "workflow": template.workflow or {"nodes": [], "edges": []},
            "workflowId": template.workflow_id,
            "calls": template.calls,
            "lastModified": last_modified,
            "createdAt": template.created_at.isoformat() if template.created_at else None,
            "updatedAt": template.updated_at.isoformat() if template.updated_at else None,
        }

    @staticmethod
    def _payload_to_model_values(template_id: str, data: AgentTemplateCreate) -> dict[str, Any]:
        workflow_id = AgentTemplateService._build_workflow_id(template_id)
        return {
            "id": template_id,
            "name": data.name,
            "description": data.description,
            "icon": data.icon,
            "color": data.color,
            "role": data.role,
            "system_prompt": data.system_prompt,
            "model": data.model,
            "temperature": data.temperature,
            "max_tokens": data.max_tokens,
            "status": data.status,
            "skills": [skill.model_dump() for skill in data.skills],
            "workflow": AgentTemplateService._dump_workflow(data.workflow),
            "workflow_id": workflow_id,
            "calls": data.calls,
        }

    @staticmethod
    def _build_workflow_id(template_id: str) -> str:
        raw_id = f"agent_template_{template_id}"
        if len(raw_id) <= 64:
            return raw_id
        digest = hashlib.sha1(template_id.encode("utf-8")).hexdigest()[:12]
        return f"agent_template_{digest}"

    @staticmethod
    def _dump_workflow(workflow: StudioWorkflow | None) -> dict[str, Any]:
        if not workflow:
            return {"nodes": [], "edges": []}
        return workflow.model_dump(by_alias=True)

    @staticmethod
    def _upsert_workflow(db: Session, template: AgentTemplate) -> None:
        graph_config = AgentTemplateService._build_executable_graph(template)
        workflow = db.query(Workflow).filter(Workflow.id == template.workflow_id).first()
        if workflow:
            workflow.name = template.name
            workflow.description = template.description
            workflow.category = "agent-template"
            workflow.graph_config = graph_config
            workflow.is_system = False
        else:
            db.add(Workflow(
                id=template.workflow_id,
                name=template.name,
                description=template.description,
                category="agent-template",
                graph_config=graph_config,
                is_system=False,
            ))
        db.commit()

    @staticmethod
    def _build_executable_graph(template: AgentTemplate) -> dict[str, Any]:
        studio_workflow = template.workflow or {"nodes": [], "edges": []}
        studio_nodes = studio_workflow.get("nodes", [])
        studio_edges = studio_workflow.get("edges", [])
        enabled_tools = AgentTemplateService._enabled_tool_names(template.skills or [])

        nodes = [
            AgentTemplateService._convert_node(node, template, enabled_tools)
            for node in studio_nodes
        ]
        edges = [
            AgentTemplateService._convert_edge(edge)
            for edge in studio_edges
        ]

        return {
            "version": "studio-v1",
            "template_id": template.id,
            "studio_workflow": studio_workflow,
            "nodes": nodes,
            "edges": edges,
        }

    @staticmethod
    def _convert_node(node: dict[str, Any], template: AgentTemplate, enabled_tools: list[str]) -> dict[str, Any]:
        node_type = node.get("type", "llm")
        config = node.get("config") or {}
        label = node.get("label") or node.get("id")

        if node_type == "start":
            return {"id": node["id"], "type": "start", "label": label}
        if node_type == "reply":
            return {"id": node["id"], "type": "end", "label": label}
        if node_type == "condition":
            return {"id": node["id"], "type": "router", "label": label}

        tools = []
        if node_type == "knowledge":
            tools = ["local_knowledge"]
        elif node_type == "tool":
            tools = enabled_tools
        if config.get("tools"):
            tools = AgentTemplateService._map_tool_ids(config.get("tools") or [])

        system_prompt = AgentTemplateService._node_system_prompt(node_type, label, template, config)
        return {
            "id": node["id"],
            "type": "agent",
            "label": label,
            "config": {
                "model": config.get("model") or template.model,
                "temperature": config.get("temperature") or template.temperature,
                "max_tokens": config.get("max_tokens") or template.max_tokens,
                "system_prompt": system_prompt,
                "tools": config.get("tools") or tools,
                "inputs": config.get("inputs") or {"user_input": "{user_input}"},
            },
        }

    @staticmethod
    def _convert_edge(edge: dict[str, Any]) -> dict[str, Any]:
        converted = {
            "source": edge.get("from") or edge.get("source"),
            "target": edge.get("to") or edge.get("target"),
        }
        if edge.get("label"):
            converted["condition"] = edge["label"]
        return converted

    @staticmethod
    def _node_system_prompt(node_type: str, label: str, template: AgentTemplate, config: dict[str, Any]) -> str:
        inline_prompt = config.get("prompt") or config.get("systemPrompt")
        if inline_prompt:
            return inline_prompt

        base_prompt = template.system_prompt or template.role or "你是一个可靠的研究助手。"
        output_format = config.get("output_format")
        output_rule = f"\n\n输出格式要求：{output_format}" if output_format else ""
        if node_type == "knowledge":
            query_hint = config.get("query_hint")
            query_rule = f"\n检索任务说明：{query_hint}" if query_hint else ""
            return f"{base_prompt}\n\n当前节点：{label}。请优先检索本地知识库，并基于检索结果回答。{query_rule}{output_rule}"
        if node_type == "tool":
            node_prompt = config.get("system_prompt")
            tool_rule = f"\n工具调用策略：{node_prompt}" if node_prompt else ""
            return f"{base_prompt}\n\n当前节点：{label}。请在需要时调用已配置工具完成任务，并给出结构化结果。{tool_rule}{output_rule}"
        node_prompt = config.get("system_prompt")
        prompt_body = node_prompt or base_prompt
        return f"{prompt_body}\n\n当前节点：{label}。请完成该节点职责，并把结果传递给后续节点。{output_rule}"

    @staticmethod
    def _enabled_tool_names(skills: list[dict[str, Any]]) -> list[str]:
        names: list[str] = []
        for skill in skills:
            if not skill.get("enabled", True):
                continue
            mapped_name = AgentTemplateService._map_skill_name(skill)
            if mapped_name and mapped_name not in names:
                names.append(mapped_name)
        return names

    @staticmethod
    def _map_tool_ids(tool_ids: list[Any]) -> list[str]:
        names: list[str] = []
        for tool_id in tool_ids:
            mapped_name = AgentTemplateService._map_skill_name({"id": str(tool_id), "name": str(tool_id)})
            if mapped_name and mapped_name not in names:
                names.append(mapped_name)
        return names

    @staticmethod
    def _map_skill_name(skill: dict[str, Any]) -> str | None:
        raw = " ".join(str(skill.get(key, "")) for key in ("id", "name", "description")).lower()
        if any(token in raw for token in ["knowledge", "local", "kb", "知识"]):
            return "local_knowledge"
        if any(token in raw for token in ["web", "search", "paper", "academic", "论文", "搜索", "检索"]):
            return "academic_search"
        if "health" in raw:
            return "health_check"
        if "echo" in raw:
            return "echo_text"
        return skill.get("id") or skill.get("name")
