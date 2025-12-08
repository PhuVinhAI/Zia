# PPTX Framework - Tổng hợp tính năng

## 📁 Cấu trúc thư mục

```
pptx/
├── types.ts              # Types definitions
├── themes.ts             # 10 themes có sẵn
├── constants.ts          # Layouts, fonts, colors
├── contentParser.ts      # Parse markdown thành slides
├── masterSlide.ts        # Master slide templates
├── slideBuilder.ts       # Build các loại slides
├── tableBuilder.ts       # Tables & comparison tables
├── codeBuilder.ts        # Code blocks với syntax highlighting
├── chartBuilder.ts       # Charts (bar, line, pie, area)
├── imageBuilder.ts       # Images, galleries, logos
├── presentationBuilder.ts # Main builder class
└── index.ts              # Export all
```

## 🎨 Themes (10 có sẵn)

| Theme | Mô tả |
|-------|-------|
| `default` | Theme mặc định, màu xanh dương |
| `professional` | Georgia font, formal business |
| `modern` | Segoe UI, màu tím/hồng |
| `dark` | Nền tối, text sáng |
| `minimal` | Arial, đơn giản |
| `corporate` | Calibri, business style |
| `creative` | Màu hồng/tím, sáng tạo |
| `nature` | Màu xanh lá, tự nhiên |
| `tech` | Nền tối, màu cyan |
| `elegant` | Palatino, màu nâu |

## 📝 Slide Types

### Title Slide
```markdown
# Tiêu đề chính
## Phụ đề
Tác giả hoặc thông tin thêm
```

### Section Slide
```
[SLIDE:section]
# Tên Section
## Mô tả section
```

### Content Slide (mặc định)
```markdown
# Tiêu đề slide
## Phụ đề (optional)
- Bullet point 1
- Bullet point 2
  - Nested bullet
- Bullet point 3
```

### Quote Slide
```
[SLIDE:quote]
[QUOTE:Nội dung quote:Tác giả]
```

### Image Slide
```
[SLIDE:imageOnly]
# Tiêu đề
![Caption](image_url)
```

### Thank You Slide
```
[SLIDE:thankyou]
# Cảm ơn!
email@example.com
```

## ✂️ Slide Separators

Dùng một trong các cách sau để tách slides:
```
---
***
___
[SLIDE]
[NEW_SLIDE]
```

Hoặc mỗi heading # sẽ tự động tạo slide mới.

## 📋 Lists

### Bullet List
```markdown
- Item 1
- Item 2
  - Nested item
    - Deep nested
- Item 3
```

### Numbered List
```markdown
1. First item
2. Second item
3. Third item
```

### Checklist
```markdown
- [ ] Chưa hoàn thành
- [x] Đã hoàn thành
- [ ] Đang làm
```

## 📊 Tables

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

## 💻 Code Blocks

````markdown
```javascript
function hello() {
  console.log("Hello World!");
}
```
````

## 📈 Charts

### Bar Chart
```
[CHART:bar:Title]
Label1,Label2,Label3
10,20,30
```

### Line Chart
```
[CHART:line:Title]
Jan,Feb,Mar,Apr
100,150,120,180
```

### Pie Chart
```
[CHART:pie:Title]
Category A,Category B,Category C
30,45,25
```

## 🖼️ Images

### Basic Image
```markdown
![Alt text](image_url)
![Caption](image_url "Caption text")
```

### Extended Image
```
[IMAGE:base64data,width=400,height=300,caption="Chú thích"]
```

## > Blockquotes

```markdown
> This is a quote
> It becomes a quote slide element
```

## ⚙️ Presentation Options

```html
<!--OPTIONS: {
  "title": "Presentation Title",
  "author": "Author Name",
  "theme": {"name": "professional"},
  "layout": "LAYOUT_16x9",
  "showSlideNumbers": true
} -->
```

### Layouts
- `LAYOUT_16x9` (default) - Widescreen
- `LAYOUT_16x10` - Widescreen variant
- `LAYOUT_4x3` - Standard
- `LAYOUT_WIDE` - Extra wide

## 📄 Ví dụ đầy đủ

```markdown
<!--OPTIONS: {
  "title": "Company Presentation",
  "author": "John Doe",
  "theme": {"name": "professional"}
} -->

# Welcome to Our Company
## Building the Future Together
John Doe | CEO

---

[SLIDE:section]
# About Us
## Our Story

---

# Our Mission
- Deliver exceptional value
- Innovate continuously
- Build lasting relationships

---

# Key Metrics

| Metric | 2023 | 2024 |
|--------|------|------|
| Revenue | $10M | $15M |
| Users | 100K | 250K |

---

[SLIDE:quote]
[QUOTE:Innovation distinguishes between a leader and a follower:Steve Jobs]

---

[SLIDE:thankyou]
# Thank You!
contact@company.com
```

## 🔧 Programmatic API

```typescript
import { PresentationBuilder } from './pptx';

const builder = new PresentationBuilder({
  title: 'My Presentation',
  theme: { name: 'modern' },
});

builder
  .addTitleSlide('Welcome', 'Subtitle here')
  .addContentSlide('Agenda', ['Item 1', 'Item 2', 'Item 3'])
  .addQuoteSlide('Great quote here', 'Author')
  .addThankYouSlide('Thank You!', ['email@example.com']);

const buffer = await builder.build();
```
