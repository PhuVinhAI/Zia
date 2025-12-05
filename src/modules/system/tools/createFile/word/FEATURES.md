# Word Framework - Tổng hợp tính năng

## 📁 Cấu trúc thư mục (23 files)

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
├── badgeBuilder.ts    # Badges/tags
├── mathBuilder.ts     # Math expressions (LaTeX)
├── boxBuilder.ts      # Styled boxes
├── highlightBuilder.ts# Text highlighting
├── emojiBuilder.ts    # Emoji shortcuts
├── watermarkBuilder.ts# Watermarks
├── signatureBuilder.ts# Signatures & approvals
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

### Checklist
```markdown
- [ ] Unchecked item
- [x] Checked item
- [ ] Another unchecked
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

## 📦 Boxes & Callouts

### Callouts (inline)
```
[!INFO] Information message
[!TIP] Helpful tip
[!NOTE] Note to remember
[!WARNING] Warning message
[!IMPORTANT] Important notice
[!SUCCESS] Success message
[!ERROR] Error message
```

### Boxes (multi-line)
```
[BOX:info:Title]
Content inside the box
Can be multiple lines
[/BOX]

Types: info, success, warning, error, note, quote, code
```

## 🏷️ Badges

```
[BADGE:New:primary]
[BADGE:Hot:danger]
[BADGE:Sale:success]
[BADGE:Info:info]
[BADGE:Warning:warning]
```

## ➗ Math Expressions

### Inline math
```
$E = mc^2$
$\alpha + \beta = \gamma$
```

### Block math
```
$$\sum_{i=1}^{n} x_i$$
$$\int_0^\infty e^{-x} dx$$
```

### Supported symbols
- Greek: \alpha, \beta, \gamma, \delta, \pi, \sigma, etc.
- Operators: \times, \div, \pm, \cdot
- Relations: \leq, \geq, \neq, \approx, \equiv
- Arrows: \rightarrow, \leftarrow, \Rightarrow
- Big ops: \sum, \prod, \int
- Misc: \infty, \partial, \nabla, \sqrt

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

## 😀 Emojis & Icons

### Shortcuts
```
:check: → ✅
:x: → ❌
:warning: → ⚠️
:info: → ℹ️
:star: → ⭐
:fire: → 🔥
:thumbsup: → 👍
:rocket: → 🚀
:bulb: → 💡
:heart: → ❤️
```

### Icon paragraph
```
[ICON:star:large]
[ICON:check:medium]
[ICON:fire:small]
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

## ✍️ Signatures

### Single signature
```
[SIGNATURE:Nguyễn Văn A:Giám đốc:Công ty ABC:01/01/2024]
```

### Approval block
```
[APPROVAL:Người duyệt:Chức vụ|Người lập:Chức vụ]
```

## 💧 Watermarks

```
[WATERMARK:BẢN NHÁP]
[WATERMARK:MẬT:FF0000]

Predefined: draft, confidential, sample, copy, original, urgent, approved, rejected, pending, internal
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
  },
  "watermark": {
    "text": "DRAFT",
    "color": "E0E0E0"
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

```markdown
This is text with a footnote[^1].

[^1]: This is the footnote content.
```
