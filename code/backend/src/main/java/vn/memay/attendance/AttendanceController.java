package vn.memay.attendance;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/attendance/punch")
class AttendanceController {
    private static final String GRANT = AttendanceController.class.getName() + ".grant";
    private final AttendanceService attendance;

    AttendanceController(AttendanceService attendance) {
        this.attendance = attendance;
    }

    @PostMapping("/verify")
    AttendanceService.Verified verify(@Valid @RequestBody AttendanceService.Verify input, HttpSession session) {
        session.removeAttribute(GRANT);
        var result = attendance.verify(input);
        session.setAttribute(GRANT, result.grant());
        return result.view();
    }

    @PostMapping
    AttendanceService.Result punch(@Valid @RequestBody AttendanceService.Punch input, HttpSession session) {
        return attendance.punch((AttendanceService.Grant) session.getAttribute(GRANT), input);
    }
}
