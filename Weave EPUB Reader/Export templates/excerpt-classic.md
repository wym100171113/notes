# {{ export.notesTitle }}

{% for chapter in chapters -%}
## {{ chapter.label }}

{% for highlight in chapter.highlights -%}
{{ highlight.excerptHeading }}

{{ highlight.blockquote }}
{% if highlight.metaLines.length -%}
{% for line in highlight.metaLines -%}
{{ line }}
{% endfor -%}
{% endif -%}
{% endfor -%}
{% endfor -%}
