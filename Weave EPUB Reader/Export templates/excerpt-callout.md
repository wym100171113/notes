# {{ export.notesTitle }}

{% for chapter in chapters -%}
## {{ chapter.label }}

{% for highlight in chapter.highlights -%}
### {{ highlight.styleLabel }}

{{ highlight.quoteBlock }}
{% endfor -%}
{% endfor -%}
