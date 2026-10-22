# Skills tái sử dụng từ Ellora

Ngày sao chép: 21/10/2026. Phạm vi: project-local Mẹ Mây.

## Nguồn và cách áp dụng

Nguồn: `/Users/daoquanghung/Documents/FBT/7/exe/ellora/.agents`. Bản sao: `.agents/` trong workspace Mẹ Mây. Có 19 skill và 2 file hỗ trợ; không sao chép `.DS_Store`, không symlink, không sửa source hoặc nội dung skill.

Đọc [AGENTS.md](../AGENTS.md) trước khi áp dụng. Master plan v3.2 và yêu cầu người dùng ưu tiên hơn mặc định framework, visual hoặc tool trong skill. Không tự cài React/Next/GSAP, không áp tất cả skill cùng lúc. Việc sao chép chỉ xác nhận file đã có; không chứng minh các workflow đã được thử nghiệm trên Angular.

Nếu runtime chưa hiển thị skill trong danh mục, agent mở trực tiếp SKILL.md qua đường dẫn dưới đây khi tác vụ phù hợp. Skill có thể được runtime nhận diện từ lượt/phiên tiếp theo; registry này không phụ thuộc khả năng tự động liệt kê. Không cần cài global để dùng bản project-local.

## Chọn skill theo đầu việc

| Skill | Khi dùng / lưu ý cho Mẹ Mây |
|---|---|
| [brandkit](../.agents/skills/brandkit/SKILL.md) | Ý tưởng nhận diện/brand board khi có yêu cầu; chưa phải nhận diện Mẹ Mây được duyệt. |
| [design-taste-frontend](../.agents/skills/design-taste-frontend/SKILL.md) | Tham khảo landing/trang giới thiệu; chọn lọc thiết kế, không dùng mặc định React/Next cho Angular. |
| [design-taste-frontend-v1](../.agents/skills/design-taste-frontend-v1/SKILL.md) | Chỉ khi cần hành vi v1; không dùng đồng thời v1 và bản hiện tại. |
| [full-output-enforcement](../.agents/skills/full-output-enforcement/SKILL.md) | Khi cần đầu ra đầy đủ; không mở rộng phạm vi hoặc in lại toàn bộ file đã lưu khi không cần. |
| [gpt-taste](../.agents/skills/gpt-taste/SKILL.md) | Hướng visual/motion đặc thù; chỉ chọn có chủ đích, không ép GSAP/React cho catalogue. |
| [high-end-visual-design](../.agents/skills/high-end-visual-design/SKILL.md) | Tham khảo art direction khi thiết kế đã chọn; không mặc định motion nặng. |
| [image-to-code](../.agents/skills/image-to-code/SKILL.md) | Khi được yêu cầu quy trình ảnh tham chiếu rồi hiện thực giao diện; code đích vẫn Angular. |
| [imagegen-frontend-mobile](../.agents/skills/imagegen-frontend-mobile/SKILL.md) | Concept dạng ảnh mobile; không phải scaffold ứng dụng native, không tự tạo ảnh khi chưa có đầu việc. |
| [imagegen-frontend-web](../.agents/skills/imagegen-frontend-web/SKILL.md) | Ảnh concept từng section web khi cần; không áp số lượng section marketing lên catalogue. |
| [industrial-brutalist-ui](../.agents/skills/industrial-brutalist-ui/SKILL.md) | Phong cách tùy chọn; không phải hướng thương hiệu mặc định cho sách thiếu nhi. |
| [minimalist-ui](../.agents/skills/minimalist-ui/SKILL.md) | Tham khảo bố cục/chữ/màu gọn; không ép khoảng trắng lớn vào bảng quản trị. |
| [ponytail](../.agents/skills/ponytail/SKILL.md) | Tối giản sau khi hiểu yêu cầu; không bỏ validation, security, accessibility hoặc nghiệm thu. |
| [ponytail-audit](../.agents/skills/ponytail-audit/SKILL.md) | Audit độ phức tạp toàn repo khi có yêu cầu; báo cáo không tự sửa. |
| [ponytail-debt](../.agents/skills/ponytail-debt/SKILL.md) | Thống kê các shortcut có đánh dấu khi đã có code; không tạo debt giả. |
| [ponytail-gain](../.agents/skills/ponytail-gain/SKILL.md) | Tham khảo thông tin skill; số benchmark nguồn không phải kết quả đo Mẹ Mây. |
| [ponytail-help](../.agents/skills/ponytail-help/SKILL.md) | Tra cách dùng nhóm Ponytail khi cần. |
| [ponytail-review](../.agents/skills/ponytail-review/SKILL.md) | Review diff về dư thừa; bổ sung, không thay correctness/security review. |
| [redesign-existing-projects](../.agents/skills/redesign-existing-projects/SKILL.md) | Khi đã có giao diện cần cải thiện; không giả định dự án mới có UI để audit. |
| [stitch-design-taste](../.agents/skills/stitch-design-taste/SKILL.md) | Khi dùng Google Stitch hoặc tạo design spec tương ứng; cần tool/quyền phù hợp. |

## Tài liệu đi kèm

- [Ponytail rule](../.agents/rules/ponytail.md): nguyên tắc tối giản, dùng theo giới hạn trong AGENTS.md.
- [Stitch DESIGN.md](../.agents/skills/stitch-design-taste/DESIGN.md): mẫu/reference gốc, không phải design system Mẹ Mây được duyệt.

Các kỹ năng Superpowers hiện có qua plugin tiếp tục dùng cho thiết kế, plan, debugging và verification; không cần sao chép plugin vào project. Bộ Ellora bổ sung kỹ thuật/visual, không thay quy trình thiết kế hay cho phép triển khai trước khi được yêu cầu.

## Kiểm kê tính toàn vẹn

SHA-256 của từng file nguồn lúc sao chép. Kiểm tra bản đích phải có cùng hash. Đây là kiểm tra nội dung file, không phải kiểm thử hành vi skill.

| File trong `.agents/` | SHA-256 |
|---|---|
| `rules/ponytail.md` | `1cd148db944eff33bf8bb878c41a290fe85b86de3e65ac311d5d501e71a0cdbf` |
| `skills/brandkit/SKILL.md` | `b0c4837e1bd140ca816ae54948754ddd2ac1e2a4d3619363777a80caf00b2ede` |
| `skills/design-taste-frontend/SKILL.md` | `aa194351b246b8b4799099d4ed7b033d29eab6e6e3d58d8d2172978be7b3ec89` |
| `skills/design-taste-frontend-v1/SKILL.md` | `033d45af1ed23832730642f95f40ab49db7fb5222848489a6c5656144bfc6dae` |
| `skills/full-output-enforcement/SKILL.md` | `e5bf48b1ae561511439cf71672209a10a88cee0968cc925909ff861dfa0a96a7` |
| `skills/gpt-taste/SKILL.md` | `2e64c269953f2656c21bf5a0fa6b4568e82fe0c72b36e8f84758e090349966a5` |
| `skills/high-end-visual-design/SKILL.md` | `e1e32f5e2d420872c6c7332b53d5ff7721946766b78c4822b424c2d512c8fdbc` |
| `skills/image-to-code/SKILL.md` | `4c060a8064a8b13380bc2ef3d6e6a1d0b1e316aa093cd9807d0ce9e4eeb037fa` |
| `skills/imagegen-frontend-mobile/SKILL.md` | `8a33389979f3074fa0926678e266ad2eb9234624472254469fc1ad916b9caa24` |
| `skills/imagegen-frontend-web/SKILL.md` | `6b5c2256522fdba1e3313eafa3d743b960a7b13ec029d3e6586e04b23327c1f8` |
| `skills/industrial-brutalist-ui/SKILL.md` | `fffbaac8597f07679e9d87145533567658aedba3b5eca6f16a7075a333048caa` |
| `skills/minimalist-ui/SKILL.md` | `36bc7328f085405f43b476938e62460fa573bf7e984e949e072bcf014831a44c` |
| `skills/ponytail/SKILL.md` | `d11df477b1a4e807155a7e578b135a4d9c52beef06eb3a44322940c331a06942` |
| `skills/ponytail-audit/SKILL.md` | `5560b8e383dbe2ddfddc873a1e2bf2e586e23e0cd7d995537482b2315331f6d1` |
| `skills/ponytail-debt/SKILL.md` | `c84fba75f0ca12bfe83f9a78ea02fd125c5dd3f1fbb18124105a489937f284e6` |
| `skills/ponytail-gain/SKILL.md` | `24e01d1c9715cb136ba1c4f1e52a95940c0193558b876828e537736480d6408b` |
| `skills/ponytail-help/SKILL.md` | `23ee3856c727129f87ab850985f9e9ed6368f10449816aa7ff043bf2dd45ab4d` |
| `skills/ponytail-review/SKILL.md` | `40df33b58fc6ef889b93585733feb9566b76e9586efa7f376785c1e995197ac0` |
| `skills/redesign-existing-projects/SKILL.md` | `98ad3e5b051bfb71b2795f7e8a6aa0d32b51ee095606c098a4b2822ac07926c9` |
| `skills/stitch-design-taste/DESIGN.md` | `0ab6740c4ebb1966dbceddb823a66d4bf027e960efbd73faca56cbf8370ae2ad` |
| `skills/stitch-design-taste/SKILL.md` | `46bdb08fee2dded38b6ba0a051230a502d6ac6e4044afd47592cb40c256028b5` |

Checksum lịch sử của master plan v3.1 khi hoàn tất S001 (bản lưu nguyên trạng, đã được thay thế bởi [v3.2](Me-May_MASTER_PLAN_v3.2_2026-10-21.md)): `c475f0fff53ddf8d8695fd4f258f66b0ca42292595303d8a732576185520fd03` (SHA-256).

Khi cập nhật skill từ nguồn trong tương lai: kiểm tra diff, giữ hướng dẫn tương thích Mẹ Mây, cập nhật manifest và ghi DEV_LOG; không ghi đè bản đã chỉnh cục bộ nếu chưa đối chiếu.
