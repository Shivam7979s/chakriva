"""
Prompt Builder and Unified Coding Assistant Tests — Riva 4.0
===========================================================
"""

from src.prompt_builder import PromptBuilder
from src.schemas import AiAssistantRequest, ChatHistoryItem


def test_unified_assistant_persona():
    """Validates the unified assistant system prompt and guidelines."""
    req = AiAssistantRequest(
        problemId="VRQ-000001",
        problemTitle="Two Sum",
        problemDifficulty="Easy",
        message="Hi",
    )
    prompt = PromptBuilder.build_system_prompt(req)
    assert "You are Riva, CHAKRIVA's unified, context-aware coding assistant and mentor." in prompt
    assert "Default to approximately 30–100 words for ordinary questions." in prompt
    assert "Do not repeat the problem statement" in prompt
    assert "Do not append an unprompted Socratic question to every answer." in prompt
    assert "Two Sum (Easy)" in prompt


def test_token_budget_allocation():
    """Verifies that dynamic output token limits scale conservatively by request type."""
    # Greetings
    req_greet = AiAssistantRequest(problemId="VRQ-000001", message="hi")
    assert PromptBuilder.get_max_output_tokens(req_greet) == 150

    # Code review
    req_review = AiAssistantRequest(problemId="VRQ-000001", message="Please review my code", actionType="review")
    assert PromptBuilder.get_max_output_tokens(req_review) == 500

    # Hint / Complexity
    req_hint = AiAssistantRequest(problemId="VRQ-000001", message="Give me a hint", actionType="hint")
    assert PromptBuilder.get_max_output_tokens(req_hint) == 350

    req_comp = AiAssistantRequest(problemId="VRQ-000001", message="What is the big-O complexity?")
    assert PromptBuilder.get_max_output_tokens(req_comp) == 350

    # Full solution
    req_sol = AiAssistantRequest(problemId="VRQ-000001", message="Give me the full solution walkthrough")
    assert PromptBuilder.get_max_output_tokens(req_sol) == 1500

    # Default
    req_def = AiAssistantRequest(problemId="VRQ-000001", message="Explain how two-pointers work")
    assert PromptBuilder.get_max_output_tokens(req_def) == 600


def test_code_review_compact_format():
    """Verifies that code reviews enforce the compact 5-bullet structure."""
    req = AiAssistantRequest(
        problemId="VRQ-000001",
        message="Review my code",
        actionType="review",
        codeIncluded=True,
        sourceCode="def twoSum(nums, target): return []",
        language="python"
    )
    prompt = PromptBuilder.build_system_prompt(req)
    assert "**Verdict:**" in prompt
    assert "**Complexity:**" in prompt
    assert "**Strength:**" in prompt
    assert "**Bug/Improvement:**" in prompt
    assert "**Next step:**" in prompt
    assert "Current editor code (python):" in prompt
    assert "def twoSum" in prompt


def test_code_omission_for_general_questions():
    """Verifies that editor code is omitted when not included."""
    req = AiAssistantRequest(
        problemId="VRQ-000001",
        message="What is the time complexity required?",
        codeIncluded=False,
        sourceCode=None
    )
    prompt = PromptBuilder.build_system_prompt(req)
    assert "No editor code attached for this query." in prompt


def test_draft_problem_warning():
    """Draft problems include explicit review status notice."""
    req_draft = AiAssistantRequest(
        problemId="VRQ-000099",
        message="Explain constraints",
        isDraftProblem=True
    )
    prompt = PromptBuilder.build_system_prompt(req_draft)
    assert "catalog draft review" in prompt


def test_bounded_conversation_messages():
    """Verifies that history is bounded to the most recent turns to minimize tokens."""
    history = [
        ChatHistoryItem(role="user", content=f"Message {i}")
        for i in range(15)
    ]
    req = AiAssistantRequest(
        problemId="VRQ-000001",
        message="Latest question",
        history=history
    )
    messages = PromptBuilder.build_conversation_messages(req)
    # 1 system + 6 bounded history items + 1 latest user message = 8
    assert len(messages) == 8
    assert messages[0]["role"] == "system"
    assert messages[1]["content"] == "Message 9"
    assert messages[-1]["content"] == "Latest question"
