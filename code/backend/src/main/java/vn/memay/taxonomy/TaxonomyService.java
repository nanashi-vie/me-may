package vn.memay.taxonomy;

import org.springframework.stereotype.Service;
import java.util.*;
import vn.memay.taxonomy.TaxonomyDtos.*;
import vn.memay.catalogue.BookValidation;

@Service
public class TaxonomyService {
    private final CategoryRepository categories;

    public TaxonomyService(CategoryRepository categories) {
        this.categories = categories;
    }

    public Taxonomy get() {
        return new Taxonomy(
                categories.findAllByOrderBySortOrderAsc().stream().map(c -> new Option(c.code, c.name, c.sortOrder))
                        .toList(),
                options(BookValidation.AGES, List.of("0–3", "4–6", "7–9", "10+")),
                options(List.of("PAPERBACK", "HARDCOVER"), List.of("Paperback", "Hardcover")),
                options(BookValidation.LEVELS, List.of("Starters · Pre A1", "Movers · A1", "Flyers / Key · A2",
                        "Preliminary · B1", "First · B2", "Advanced · C1", "Proficiency · C2")));
    }

    private List<Option> options(List<String> codes, List<String> labels) {
        var items = new ArrayList<Option>();
        for (int i = 0; i < codes.size(); i++)
            items.add(new Option(codes.get(i), labels.get(i), i));
        return items;
    }
}
