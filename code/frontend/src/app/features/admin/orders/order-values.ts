import { HttpErrorResponse } from '@angular/common/http';
export const MAX_ORDER_VALUE=Number.MAX_SAFE_INTEGER;
export const vnd=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(value)+'đ';
export const integer=(value:unknown,min=0,max=MAX_ORDER_VALUE):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
export function product(a:unknown,b:unknown):number|null{if(!integer(a)||!integer(b))return null;const n=BigInt(a)*BigInt(b);return n>BigInt(MAX_ORDER_VALUE)?null:Number(n);}
export function orderError(e:HttpErrorResponse):string{
 const errors:Record<string,string>={version_conflict:'Đơn đã thay đổi. Tải lại dữ liệu trước khi lưu.',stock_conflict:'Sách không còn đủ số lượng. Kiểm tra tồn trước khi thử lại.',stock_capacity_conflict:'Chưa thể nhập lại tồn vì vượt sức chứa. Kiểm tra số tồn của sách.',deposit_required:'Chưa đủ tiền cọc yêu cầu. Ghi nhận tiền đã nhận hoặc xác nhận ngoại lệ.',cod_review_required:'Cần xem lại và xác nhận COD trước khi bàn giao.',parcel_weight_review_required:'Cần xác nhận lại trọng lượng kiện.',reservation_conflict:'Tồn đang giữ không khớp với đơn. Tải lại và kiểm tra.',transition_conflict:'Thao tác không còn phù hợp với trạng thái đơn.',idempotency_conflict:'Nội dung lần thử lại không khớp. Kiểm tra kết quả thao tác trước đó.',customer_archived:'Khách đã được lưu trữ. Chọn khách đang hoạt động.',forbidden:'Bạn không có quyền quản lý đơn hàng.',not_found:'Không tìm thấy đơn hoặc dòng sách này.'};
 if(e.status===0||e.status>=500)return 'Chưa xác định được kết quả lưu. Thử lại cùng yêu cầu để kiểm tra, không tạo giao dịch mới.';
 return errors[e.error?.error]||e.error?.message||'Không thể lưu. Kiểm tra thông tin và thử lại.';
}

export function keepEnd(until:string|null):string|null{const n=until?Date.parse(until):NaN;return Number.isFinite(n)?new Date(n-1).toISOString():null;}
