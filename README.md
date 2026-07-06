# Draw.io MCP — UML Diagram Generator

**drawio-mcp** là một MCP server (Model Context Protocol) cho phép bạn sinh UML diagrams chất lượng cao ngay trong quá trình chat với AI — không cần rời khỏi terminal, không cần công cụ vẽ tay.

## 🎯 Vấn đề & Giải pháp

| Trước đây | Với drawio-mcp |
|-----------|----------------|
| Bạn phải tự vẽ diagram bằng tay trong draw.io, LucidChart, hay PlantUML | Bạn mô tả bằng ngôn ngữ tự nhiên, AI sinh file `.drawio` ngay lập tức |
| Mất 10–30 phút để kéo thả align từng box | Mất vài giây — AI tự layout chuẩn UML |
| Không tích hợp được vào AI tools | Là MCP server — kết nối trực tiếp với Claude, Cursor, Codex qua MCP protocol |
| File không chuẩn, khó chỉnh sửa lại | File `.drawio` chuẩn — mở bằng diagrams.net, kéo thả chỉnh sửa tiếp được |

Kết quả: **Bạn tập trung vào thiết kế, AI lo phần trình bày.**

## ✨ Tính năng nổi bật

- 🎯 **Tự động layout** — không cần chỉ định tọa độ, AI tự sắp xếp theo chuẩn UML
- 🔄 **Backward edges / loops** — activity diagram hỗ trợ đường vòng (error → retry) với waypoints thông minh
- 🎨 **Đúng ký hiệu UML** — bullseye end node, filled sync arrows, activation bars, lifelines
- 🏊 **Swimlanes** — activity diagram có swimlane với topological ordering
- 🔁 **Self-loops** — sequence diagram hỗ trợ self-message (U-shape)
- 📁 **Output chuẩn .drawio** — mở được bằng diagrams.net, chỉnh sửa được bằng giao diện kéo thả

## 📊 Hỗ trợ 4 loại sơ đồ

| Diagram | Ký hiệu đặc biệt |
|---------|-----------------|
| **Class Diagram** | Classes, attributes, methods, stereotypes (interface/abstract/enum), 6 loại relationships |
| **Use Case Diagram** | Actors, use cases, system boundary, include/extend/generalization |
| **Activity Diagram** | Start/end (bullseye), action, decision, merge, fork/join, swimlanes, backward edges, labeled flows |
| **Sequence Diagram** | Participants (actor/boundary/control/entity), lifelines, activation bars, self-loops, 5 message types |

---

## 🚀 Cài đặt

### Yêu cầu
- Node.js ≥ 18.0.0
- npm

### Clone & build

```bash
git clone <repo-url> drawio-mcp
cd drawio-mcp
npm install
npm run build
```

Kết quả: thư mục `dist/` chứa file `dist/index.js` — đây là entry point của MCP server.

---

## ⚙️ Cấu hình trên các nền tảng

### Claude Code (CLI)

Thêm vào file `~/.claude/settings.json` (global) hoặc `.claude/settings.local.json` (project):

```json
{
  "mcpServers": {
    "drawio-uml": {
      "command": "node",
      "args": ["D:\\path\\to\\drawio-mcp\\dist\\index.js"]
    }
  }
}
```

> **Lưu ý:** Dùng path tuyệt đối đến thư mục dự án. Trên Windows dùng `\\`, trên Mac/Linux dùng `/`.

### Claude Desktop

Mở Settings → Developer → MCP Servers → Add → Điền:

| Field | Value |
|-------|-------|
| **Name** | `drawio-uml` |
| **Command** | `node` |
| **Arguments** | `["D:\\path\\to\\drawio-mcp\\dist\\index.js"]` |

Hoặc sửa file cấu hình Claude Desktop tại:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "drawio-uml": {
      "command": "node",
      "args": ["D:\\path\\to\\drawio-mcp\\dist\\index.js"]
    }
  }
}
```

### Cursor

Thêm vào file `.cursor/settings.json` trong project:

```json
{
  "mcpServers": {
    "drawio-uml": {
      "command": "node",
      "args": ["D:\\path\\to\\drawio-mcp\\dist\\index.js"]
    }
  }
}
```

### Codex / Windsurf / Cline / Continue / Các IDE khác

Thêm MCP server với cấu hình tương tự:

```json
{
  "mcpServers": {
    "drawio-uml": {
      "command": "node",
      "args": ["/absolute/path/to/drawio-mcp/dist/index.js"]
    }
  }
}
```

Sau khi cấu hình, restart IDE. Tools sẽ xuất hiện trong danh sách MCP tools.

---

## 🛠️ Các MCP Tools

| Tool | Description |
|------|-------------|
| `draw_class_diagram` | Create UML class diagram |
| `draw_usecase_diagram` | Create use case diagram |
| `draw_activity_diagram` | Create activity diagram |
| `draw_sequence_diagram` | Create sequence diagram |

Sau khi gọi, mỗi tool tạo file `.drawio` trong thư mục `./output/` và trả về đường dẫn file.

---

## 💡 Prompt templates chuẩn

Dưới đây là các prompt đã tối ưu để sinh từng loại diagram. Copy-paste nguyên mẫu và thay đổi thông tin của bạn.

### 1. Class Diagram

````
Vẽ class diagram cho hệ thống quản lý thư viện:

- class Book: attributes = [id, title, author, isbn], methods = [borrow(), return()]
- class Member: attributes = [id, name, email], methods = [borrowBook(), returnBook()]
- class Librarian extends Member: attributes = [employeeId]
- class BorrowRecord: attributes = [id, borrowDate, dueDate]
- class Library: attributes = [name, address]

Relationships:
- Librarian → Member (inheritance)
- BorrowRecord → Member (association, "borrowed by")
- BorrowRecord → Book (association, "contains")
- Library → Book (aggregation, "has")
````

Kết quả: File `.drawio` với đầy đủ class compartments, stereotypes, relationships đúng UML.

### 2. Use Case Diagram

````
Vẽ use case diagram cho hệ thống ATM:

System name: "ATM System"

Actors:
- Customer (mô tả: người dùng ATM)
- Bank Admin (mô tả: quản trị viên ngân hàng)

Use cases:
- "Withdraw Cash" (id: uc1)
- "Deposit Cash" (id: uc2)
- "Transfer Funds" (id: uc3)
- "Check Balance" (id: uc4)
- "Change PIN" (id: uc5)
- "Manage Users" (id: uc6)

Associations:
- Customer → uc1
- Customer → uc2
- Customer → uc3
- Customer → uc4
- Customer → uc5
- Bank Admin → uc6

Relationships:
- uc3 → uc2 (include)  — Transfer cần Deposit để có tiền
- uc5 → uc4 (extend)   — Change PIN có thể cần Check Balance

System boundary: "ATM System" bao gồm tất cả use cases
````

Kết quả: Actors bên trái, use cases bên phải trong system boundary.

### 3. Activity Diagram

````
Vẽ activity diagram cho quy trình đặt hàng online:

Start node: s1
Action nodes:
- login (label: "Log in")
- browse (label: "Browse products")
- cart (label: "Add to cart")
- checkout (label: "Proceed to checkout")
- payment (label: "Process payment")
- confirm (label: "Send confirmation")
- cancel (label: "Cancel order")
- redirect (label: "Redirect to payment gateway")
- verify (label: "Verify payment")

End nodes: e1, e2

Decision nodes:
- d1 (label: "Continue shopping?")
- d2 (label: "Payment successful?")

Flows:
- s1 → login
- login → browse
- browse → cart
- cart → d1
- d1 → checkout (label: "Yes")
- d1 → browse (label: "No")             # backward edge (loop)
- checkout → redirect
- redirect → payment
- payment → d2
- d2 → verify (label: "Yes")
- d2 → payment (label: "No")            # backward edge (loop)
- verify → confirm
- confirm → e1
- checkout → cancel (label: "Cancel")
- cancel → e2

Swimlanes: (tùy chọn — bỏ nếu không cần)
- "Customer" gồm: [s1, login, browse, cart, d1, checkout, cancel]
- "System" gồm: [redirect, payment, d2, verify]
- "Email Service" gồm: [confirm]
````

Kết quả: Layout theo topological levels, backward edges có waypoints, decision branches có nhãn Yes/No.

**Mẹo:** Bỏ phần `swimlanes` nếu muốn layout đơn giản, chỉ giữ lại nodes + flows.

### 4. Sequence Diagram

````
Vẽ sequence diagram cho chức năng đăng nhập:

Participants:
- "User" (type: actor)
- "LoginPage" (type: boundary)
- "AuthController" (type: control)
- "UserService" (type: control)
- "Database" (type: entity)

Messages:
- User → LoginPage: "enterCredentials()" (synchronous, order: 1)
- LoginPage → AuthController: "login(email, password)" (synchronous, order: 2)
- AuthController → AuthController: "validateInput()" (synchronous, order: 3)  # self-loop
- AuthController → UserService: "findByEmail()" (synchronous, order: 4)
- UserService → Database: "query()" (synchronous, order: 5)
- Database → UserService: "userData" (return, order: 6)
- UserService → AuthController: "user" (return, order: 7)
- AuthController → AuthController: "verifyPassword()" (synchronous, order: 8)  # self-loop
- AuthController → LoginPage: "authResult" (return, order: 9)
- LoginPage → User: "showDashboard()" (return, order: 10)
````

Kết quả: Participants header ngang trên cùng, lifelines dọc, activation bars xám, self-loops vẽ U-shape bên phải.

**Mẹo:** 
- `type: "actor"` → không có activation bar (đúng UML)
- `type: "boundary"` / `"control"` / `"entity"` → có màu khác nhau
- `type: "return"` → dashed line, gray, open arrow
- `type: "asynchronous"` → dashed line, open arrow

---

## 📂 Output

File sinh ra ở `./output/` với tên dạng `<prefix>-<timestamp>.drawio`.

Mở bằng:
1. [app.diagrams.net](https://app.diagrams.net/) → File → Open → chọn file
2. Hoặc VS Code extension "Draw.io Integration"

---

## 🧪 Development

```bash
npm run dev        # Chạy MCP server với tsx (hot reload)
npm run test       # Chạy unit tests
npm run build      # Build TypeScript → dist/
npm run inspect    # Test với MCP Inspector
```

---

## 🏗️ Kiến trúc dự án

```
src/
├── index.ts                    # Entry point MCP server (stdio)
├── types/                      # Zod schemas + TypeScript interfaces
│   ├── class-diagram.ts
│   ├── usecase-diagram.ts
│   ├── activity-diagram.ts
│   └── sequence-diagram.ts
├── builders/                   # Sinh mxGraph XML cells
│   ├── base-builder.ts         # Abstract class (ID, addVertex, addEdge, serialize)
│   ├── class-builder.ts
│   ├── usecase-builder.ts
│   ├── activity-builder.ts
│   └── sequence-builder.ts
├── tools/                      # MCP tool definitions
│   ├── class-diagram.ts
│   ├── usecase-diagram.ts
│   ├── activity-diagram.ts
│   └── sequence-diagram.ts
└── utils/
    ├── diagram-writer.ts       # Ghi file .drawio
    ├── compression.ts          # Deflate + base64
    ├── layout.ts               # Grid layout helpers
    └── styles.ts               # draw.io mxGraph styles
```

---

## 📝 License

MIT
