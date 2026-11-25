package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.assertj.core.api.Assertions.*;
class TitleMatchTest {
 private static double s(String q,String t){return TitleMatch.score(TitleMatch.normalize(q),TitleMatch.normalize(t));}
 @ParameterizedTest @CsvSource(delimiter='|',quoteCharacter='"',value={
  "Harry Potter|Harry Potter và hòn đá phù thủy","hoàng tử bé|Hoàng Tử Bé (bìa cứng)","bé và đốm|Đốm và Bé",
  "Hary Poter|Harry Potter","Tottochan|Totto-chan bên cửa sổ","Harry Potter tập 2|Harry Potter tập 3",
  "wheres spot|Where's Spot?","Peppa Pig Goes Swimming|Peppa Pig Goes Camping","sach cuo|sách cuối"})
 void suggests(String q,String t){assertThat(s(q,t)).isGreaterThanOrEqualTo(TitleMatch.THRESHOLD);}
 @ParameterizedTest @CsvSource(delimiter='|',quoteCharacter='"',value={"sách cuối|sách 1","The Gruffalo|The Snowman","10|12","a|Anh"})
 void ignores(String q,String t){assertThat(s(q,t)).isLessThan(TitleMatch.THRESHOLD);}
 @Test void normalizes(){
  assertThat(TitleMatch.normalize("  ĐỐM’s  và-Bé! ")).isEqualTo("doms va be");
  assertThat(TitleMatch.normalize("?!…")).isEmpty();
  assertThat(TitleMatch.normalize("日本 の本")).isEqualTo("日本 の本");
  assertThat(TitleMatch.normalize(null)).isEmpty();
  assertThat(TitleMatch.score("","anything")).isZero();
 }
}
