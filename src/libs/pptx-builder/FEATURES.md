# PPTX Framework - Tổng hợp tính năng

## 📁 Cấu trúc thư mục (10 files)

```
pptx/
├── types.ts              # Types definitions
├── themes.ts             # 10 themes có sẵn
├── constants.ts          # Layouts, fonts, colors, icons
├── contentParser.ts      # Parse markdown thành slides
├── masterSlide.ts        # Master slide templates
├── slideBuilder.ts       # Build các loại slides
├── tableBuilder.ts       # Tables & comparison tables
├── codeBuilder.ts        # Code blocks với syntax highlighting
├── chartBuilder.ts       # Charts (bar, line, pie, area)
├── imageBuilder.ts       # Images, galleries, logos
├── shapeBuilder.ts       # Shapes, callouts, badges, timeline
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

### Two Column Slide
```
[SLIDE:twoColumn]
# So sánh A vs B
- Item bên trái 1
- Item bên trái 2
- Item bên phải 1
- Item bên phải 2
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

### Table Styles
- `default` - Header màu primary
- `striped` - Rows xen kẽ màu
- `bordered` - Viền rõ ràng
- `minimal` - Đơn giản
- `colorful` - Màu accent

## 💻 Code Blocks

````markdown
```javascript
function hello() {
  console.log("Hello World!");
}
```
````

### Code Styles
- `default` - Nền sáng
- `dark` - Nền tối (VS Code style)
- `light` - Nền trắng
- `terminal` - Style terminal với buttons

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

### Area Chart
```
[CHART:area:Title]
Q1,Q2,Q3,Q4
100,120,90,150
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

### Image Gallery
Nhiều images sẽ tự động layout thành gallery.

## 📦 Callouts

```
[!INFO] Thông tin quan trọng
[!TIP] Mẹo hữu ích
[!NOTE] Ghi chú
[!WARNING] Cảnh báo
[!IMPORTANT] Quan trọng
[!SUCCESS] Thành công
[!ERROR] Lỗi
```

## 🎯 Boxes

```
[BOX:info:Tiêu đề]
Nội dung box
Nhiều dòng
[/BOX]
```

Types: `info`, `success`, `warning`, `error`, `note`, `quote`, `code`

## 🏷️ Badges

```
[BADGE:New:primary]
[BADGE:Hot:danger]
[BADGE:Sale:success]
```

Types: `default`, `primary`, `success`, `warning`, `danger`, `info`

## ➗ Dividers

```
[DIVIDER]
[DIVIDER:solid]
[DIVIDER:dashed]
[DIVIDER:dotted]
[DIVIDER:double]
[DIVIDER:decorated:Text ở giữa]
```

## 🔄 Process Flow

```
[PROCESS]
Step 1:Mô tả 1
Step 2:Mô tả 2
Step 3:Mô tả 3
[/PROCESS]
```

## 📅 Timeline

```
[TIMELINE]
2020:Event 1:Description
2021:Event 2:Description
2022:Event 3:Description
[/TIMELINE]
```

## 🎭 Shapes

```
[SHAPE:rect:x,y,w,h:color]
[SHAPE:ellipse:x,y,w,h:color]
[SHAPE:roundRect:x,y,w,h:color]
[SHAPE:triangle:x,y,w,h:color]
[SHAPE:arrow:x,y,w,h:color]
```

## 🖼️ Background

```
[BACKGROUND:#FF5500]
[BACKGROUND:gradient:color1:color2]
[BACKGROUND:image:base64data]
```

## 🎬 Transitions

```
[TRANSITION:fade]
[TRANSITION:push]
[TRANSITION:wipe]
[TRANSITION:split]
[TRANSITION:dissolve]
```

## 📝 Speaker Notes

```
[NOTES]
Ghi chú cho người thuyết trình
Không hiển thị trên slide
[/NOTES]
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
  "showSlideNumbers": true,
  "masterSlide": {
    "logo": {
      "data": "base64...",
      "x": 0.3,
      "y": 0.3,
      "width": 1.0,
      "height": 0.5
    }
  }
} -->
```

### Layouts
- `LAYOUT_16x9` (default) - Widescreen
- `LAYOUT_16x10` - Widescreen variant
- `LAYOUT_4x3` - Standard
- `LAYOUT_WIDE` - Extra wide

## 😀 Icons

Sử dụng Unicode icons trực tiếp:
```
✓ ✗ ★ ♥ ◆ ● ■ ▲ → ← ↑ ↓
⚠ ℹ 💡 🔥 🚀 👍 📊 🎯 🏆
```

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

[!TIP] We focus on customer success

---

# Key Metrics

| Metric | 2023 | 2024 |
|--------|------|------|
| Revenue | $10M | $15M |
| Users | 100K | 250K |
| NPS | 45 | 62 |

---

[SLIDE:twoColumn]
# Pros vs Cons
- Fast delivery
- Great support
- Scalable
- Learning curve
- Initial cost
- Setup time

---

[SLIDE:quote]
[QUOTE:Innovation distinguishes between a leader and a follower:Steve Jobs]

---

[SLIDE:thankyou]
# Thank You!
contact@company.com
www.company.com
```

## 💡 Tips

1. **Slide đầu tiên** tự động là title slide nếu chỉ có heading
2. **Mỗi `---`** tạo slide mới
3. **Bullets tự động** chia đều cho two-column slide
4. **Images** tự động scale để fit slide
5. **Tables** tự động style với theme colors
6. **Code blocks** có syntax highlighting cơ bản
7. **Charts** tự động chọn màu từ theme

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
