# Generated by Django 5.2 on 2025-04-15 00:03

from django.db import migrations


def add_llm(display_name, internal_name, provider_name, cost_per_1m_tokens, max_tokens, use_temperature):
    from lyrical.models import LLM, LLMProvider

    provider = LLMProvider.objects.get(internal_name=provider_name)

    llm = LLM(
        display_name=display_name,
        internal_name=internal_name,
        provider=provider,
        cost_per_1m_tokens=cost_per_1m_tokens,
        max_tokens=max_tokens,
        use_temperature=use_temperature,
    )
    llm.save()
    return llm


def add_data(apps, schema_editor):
    llm_provider = apps.get_model("lyrical", "LLMProvider")
    llm = apps.get_model("lyrical", "LLM")

    # import litellm
    # for model in litellm.utils.get_valid_models():
    #     print(model)

    llm_provider.objects.create(display_name="OpenAI", internal_name="openai")
    llm_provider.objects.create(display_name="Anthropic", internal_name="anthropic")
    llm_provider.objects.create(display_name="Google", internal_name="gemini")
    llm_provider.objects.create(display_name="xAI", internal_name="xai")
    llm_provider.objects.create(display_name="Ollama", internal_name="ollama")

    add_llm("GPT:4.1", "gpt-4.1", "openai", 8.0, 32, True)
    add_llm("GPT:4o", "gpt-4o", "openai", 10.0, 200, True)
    add_llm("o4-mini", "o4-mini", "openai", 4.40, 100, False)

    add_llm("Gemini-Flash:1.5", "gemini-1.5-flash", "gemini", 0.30, 1000, True)
    add_llm("Gemini-Flash:2.0", "gemini-2.0-flash", "gemini", 0.40, 1000, True)
    add_llm("Gemini-Flash:2.5", "gemini-2.5-flash-preview-05-20", "gemini", 3.50, 1000, True)
    add_llm("Gemini-Pro:2.5", "gemini-2.5-pro-preview-06-05", "gemini", 10.00, 1000, True)

    add_llm("Claude:3.0 Haiku", "claude-3-haiku-20240307", "anthropic", 1.25, 200, True)
    add_llm("Claude:3.5 Haiku", "claude-3-5-haiku-latest", "anthropic", 4.0, 200, True)
    add_llm("Claude:3.7 Sonnet", "claude-3-7-sonnet-latest", "anthropic", 15.0, 200, True)
    add_llm("Claude:4.0 Sonnet", "claude-4-sonnet-20250514", "anthropic", 15.0, 200, True)

    add_llm("Gemma3:4b", "gemma3:4b", "ollama", 0.0, 128, True)


def remove_data(apps, schema_editor):
    apps.get_model("lyrical", "LLM").objects.all().delete()
    apps.get_model("lyrical", "LLMProvider").objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("lyrical", "0002_schema"),
    ]

    operations = [
        migrations.RunPython(add_data, reverse_code=remove_data)
    ]
