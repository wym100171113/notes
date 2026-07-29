# {{ export.notesTitle }}

{% for chapter in chapters -%}
{% for highlight in chapter.highlights -%}
{{ highlight.text }}{{ highlight.citationInline }}
{{ highlight.createdTimeFormatted }}

{% endfor -%}
{% endfor -%}
