# Word Framework - Tổng hợp tính năng

## 📁 Cấu trúc thư mục (18 files)

```
word/
├── types.ts           # Types definitions
├── themes.ts          # 5 themes có sẵn
├── constants.ts       # Page sizes, margins, fonts
├── styleBuilder.ts    # Document styles & numbering
├── tableBuilder.ts    # Markdown tables
├── contentBuilder.ts  # Main content parser (tích hợp tất cả)
├── headerFooter.ts    # Header/Footer với page numbers
├── tocBuilder.ts      # Table of Contents
├── footnoteBuilder.ts # Footnotes
├── imageBuilder.ts    # Images
├── listBuilder.ts     # Checklist, definition lists
├── columnBuilder.ts   # Multi-column layouts
├── dividerBuilder.ts  # Dividers/separators
├── mathBuilder.ts     # Math expressions (OMML)
├── highlightBuilder.ts# Text highlighting
├── coverPageBuilder.ts# Cover pages
├── documentBuilder.ts # Main builder class
└── index.ts           # Export all
```

## 🎨 Themes (5 có sẵn)

| Theme | Mô tả |
|-------|-------|
| `default` | Theme mặc định, Calibri font |
| `professional` | Georgia/Times New Roman, formal |
| `modern` | Segoe UI, màu tím/hồng |
| `academic` | Times New Roman, double spacing |
| `minimal` | Arial, đơn giản |

## 📝 Text Formatting

### Markdown cơ bản
```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4

**bold** hoặc __bold__
*italic* hoặc _italic_
***bold italic***
~~strikethrough~~
`inline code`
[link text](url)
```

### Alignment
```
->Centered text<-
->Right aligned text
```

### Highlights
```
==highlighted text==
[HIGHLIGHT:yellow]text[/HIGHLIGHT]
[HIGHLIGHT:green]text[/HIGHLIGHT]
[HIGHLIGHT:cyan]text[/HIGHLIGHT]
```

## 📋 Lists

### Bullet list
```markdown
- Item 1
  - Nested item
    - Deep nested
- Item 2
```

### Numbered list
```markdown
1. First
2. Second
   1. Nested
3. Third
```

### Definition list
```
Term
: Definition of the term
```

## 📊 Tables

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

## ➗ Math Expressions (OMML)

Math được render bằng OMML (Office Math Markup Language) - format native của Word.

### Inline math
```
$E = mc^2$
$\alpha + \beta = \gamma$
```

### Block math (centered)
```
$$\sum_{i=1}^{n} x_i$$
$$\int_0^\infty e^{-x} dx$$
```

### Supported LaTeX
- Fractions: `\frac{a}{b}`
- Square root: `\sqrt{x}`
- Superscript: `x^{2}` or `x^2`
- Subscript: `x_{i}` or `x_i`
- Sum: `\sum_{i=1}^{n}`
- Integral: `\int_{0}^{\infty}`
- Greek: \alpha, \beta, \gamma, \delta, \pi, \sigma, \omega
- Operators: \times, \div, \pm, \cdot
- Relations: \leq, \geq, \neq, \approx, \equiv
- Arrows: \rightarrow, \leftarrow, \Rightarrow
- Misc: \infty, \partial, \nabla

## 🖼️ Images

```markdown
![Alt text](image_url)
![Caption](image_url "Caption text")

[IMAGE:base64data, width=400, height=300, caption="Caption"]
```

## ✂️ Dividers

```
[DIVIDER]
[DIVIDER:solid]
[DIVIDER:dashed]
[DIVIDER:dotted]
[DIVIDER:double]
[DIVIDER:wave]
[DIVIDER:thick]
[DIVIDER:decorated:Custom Text]
[DIVIDER:star]
[DIVIDER:floral]
```

## 📄 Document Structure

### Cover page
```
[COVER:Title:Subtitle:Author:Organization:Date:Version:Style]

Styles: simple, professional, academic, modern
```

### Page break
```
[PAGE_BREAK]
---PAGE---
```

### Table of Contents
```json
<!--OPTIONS: {"includeToc": true, "tocTitle": "Mục Lục"} -->
```

## ⚙️ Document Options

```html
<!--OPTIONS: {
  "theme": {"name": "professional"},
  "pageSize": "A4",
  "orientation": "portrait",
  "margins": {"top": 25, "bottom": 25, "left": 25, "right": 25},
  "includeToc": true,
  "tocTitle": "Mục Lục",
  "header": {
    "text": "Header Text",
    "alignment": "center",
    "includePageNumber": true
  },
  "footer": {
    "text": "Footer Text",
    "alignment": "center",
    "includePageNumber": true
  }
} -->
```

### Margins
- Giá trị nhỏ (< 100): được hiểu là mm (millimeters)
  - Ví dụ: `"margins": {"top": 25, "left": 25}` = 25mm
- Giá trị lớn (>= 100): được hiểu là twips (1 inch = 1440 twips)
  - Ví dụ: `"margins": {"top": 1440}` = 1 inch
- Mặc định: 25.4mm (1 inch) cho tất cả các cạnh

### Page sizes
- `A4` (default)
- `Letter`
- `Legal`

### Orientations
- `portrait` (default)
- `landscape`

## 💻 Code Blocks

````markdown
```javascript
function hello() {
  console.log("Hello World!");
}
```
````

## 📖 Blockquotes

```markdown
> This is a blockquote
> It can span multiple lines
```

## 🔢 Footnotes

Footnotes hiển thị ở cuối trang như trong Word chuẩn.

```markdown
This is text with a footnote[^1]. And another[^2].

[^1]: This is the first footnote content.
[^2]: This is the second footnote.
```
