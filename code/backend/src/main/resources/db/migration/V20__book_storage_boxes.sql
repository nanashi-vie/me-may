create table book_storage_box (
    number integer primary key check (number > 0)
);

alter table book_copy add column storage_box_number integer references book_storage_box(number);
create index book_copy_storage_box_idx on book_copy(storage_box_number);
