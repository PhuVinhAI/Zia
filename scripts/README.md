# Scripts

Các script CLI để quản lý database và bot.

## Database CLI (`db.ts`)

Quản lý database tổng quan, thay thế Drizzle Studio.

```bash
# Thống kê database
bun scripts/db.ts stats

# Liệt kê các bảng
bun scripts/db.ts tables

# Chạy SQL query
bun scripts/db.ts query "SELECT * FROM users"
bun scripts/db.ts query "SELECT COUNT(*) FROM history"

# Xem lịch sử chat
bun scripts/db.ts history        # 20 tin gần nhất
bun scripts/db.ts history 50     # 50 tin gần nhất

# Xem users
bun scripts/db.ts users

# Xem memories
bun scripts/db.ts memories       # 20 memories gần nhất
bun scripts/db.ts memories 50    # 50 memories gần nhất

# Xóa dữ liệu (cần confirm)
bun scripts/db.ts clear          # Xóa tất cả
bun scripts/db.ts clear history  # Chỉ xóa history
bun scripts/db.ts clear memories # Chỉ xóa memories
```

## Memory CLI (`memory.ts`)

Quản lý long-term memory với semantic search.

```bash
# Liệt kê memories
bun scripts/memory.ts list       # 20 gần nhất
bun scripts/memory.ts list 50    # 50 gần nhất

# Tìm kiếm semantic
bun scripts/memory.ts search "sở thích"
bun scripts/memory.ts search "lập trình" 10

# Thêm memory
bun scripts/memory.ts add "User Minh thích lập trình AI" person
bun scripts/memory.ts add "Ngày mai có họp lúc 9h" task

# Xóa memory
bun scripts/memory.ts delete 5

# Thống kê
bun scripts/memory.ts stats

# Export/Import
bun scripts/memory.ts export backup.json
bun scripts/memory.ts import backup.json
```

## Memory Types

| Type | Mô tả |
|------|-------|
| `person` | Thông tin về người (tên, tuổi, công việc...) |
| `fact` | Sự kiện, thông tin thực tế |
| `preference` | Sở thích, ưu tiên |
| `task` | Công việc, nhắc nhở |
| `note` | Ghi chú chung |
| `conversation` | Tóm tắt cuộc trò chuyện |
