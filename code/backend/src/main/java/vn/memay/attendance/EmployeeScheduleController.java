package vn.memay.attendance;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/attendance")
class EmployeeScheduleController {
    private final EmployeeService employees;
    private final ScheduleService schedules;

    EmployeeScheduleController(EmployeeService employees, ScheduleService schedules) {
        this.employees = employees;
        this.schedules = schedules;
    }

    @GetMapping("/employees")
    List<EmployeeService.Employee> employees() {
        return employees.list();
    }

    @PostMapping("/employees")
    @ResponseStatus(HttpStatus.CREATED)
    EmployeeService.Employee create(@Valid @RequestBody EmployeeService.Create input) {
        return employees.create(input);
    }

    @PutMapping("/employees/{id}")
    EmployeeService.Employee edit(@PathVariable long id, @Valid @RequestBody EmployeeService.Edit input) {
        return employees.edit(id, input);
    }

    @PutMapping("/employees/{id}/pin")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void reset(@PathVariable long id, @Valid @RequestBody EmployeeService.Pin input) {
        employees.reset(id, input);
    }

    @GetMapping("/weeks/{monday}")
    ScheduleService.Week week(@PathVariable LocalDate monday) {
        return schedules.get(monday);
    }

    @PutMapping("/weeks/{monday}")
    ScheduleService.Week saveWeek(@PathVariable LocalDate monday, @Valid @RequestBody ScheduleService.Save input) {
        return schedules.save(monday, input);
    }
}
