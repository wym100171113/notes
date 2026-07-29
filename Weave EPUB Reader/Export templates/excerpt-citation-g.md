# {{ export.notesTitle }}

{% for chapter in chapters -%}
{% for highlight in chapter.highlights -%}
"{{ highlight.text }}"
{{ highlight.citationAcademic }}

{% endfor -%}
{% endfor -%}
