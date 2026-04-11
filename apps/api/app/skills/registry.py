# app/skills/registry.py
import logging
from app.skills.builtins import EchoTextSkill, HealthCheckSkill, QueryTaskSkill
from app.skills.search_skills import AcademicSearchSkill, LocalKnowledgeSkill

logger = logging.getLogger("skill_registry")

class SkillRegistry:
    def __init__(self):
        self._skills = {}

    def register(self, name: str, executor):
        self._skills[name] = executor

    def get(self, name: str):
        return self._skills.get(name)

    def list_names(self):
        return list(self._skills.keys())

skill_registry = SkillRegistry()
skill_registry.register("echo_text", EchoTextSkill())
skill_registry.register("health_check", HealthCheckSkill())
skill_registry.register("query_task", QueryTaskSkill())
skill_registry.register("academic_search", AcademicSearchSkill())
skill_registry.register("local_knowledge", LocalKnowledgeSkill())
