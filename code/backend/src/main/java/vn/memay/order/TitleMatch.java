package vn.memay.order;
import java.text.Normalizer;
import java.util.*;
/** Compares book titles by the share of typed characters found in the other title. */
final class TitleMatch {
 static final double THRESHOLD=0.6;
 /** Dropped and spaced characters are listed, not locale classes, and case folds per character, so SQL normalizes identically. */
 static final String DROPPED="'’‘`",SPACED="!\"#$%&()*+,-./:;<=>?@[\\]^_{|}~“”–—…«»·\t\n\u000B\f\r\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000";
 private static final double EPSILON=1e-9;
 private TitleMatch(){}
 static String normalize(String raw){
  if(raw==null)return "";
  var out=new StringBuilder();
  for(char c:Normalizer.normalize(raw,Normalizer.Form.NFD).replaceAll("[\\u0300-\\u036F]","").replace('Đ','d').replace('đ','d').toCharArray())
   if(DROPPED.indexOf(c)<0)out.append(SPACED.indexOf(c)<0?Character.toLowerCase(c):' ');
  return out.toString().replaceAll(" +"," ").strip();
 }
 /** Both arguments must already be normalized. */
 static double score(String query,String title){
  if(query.isEmpty()||title.isEmpty())return 0;
  if(query.equals(title))return 1;
  String joined=query.replace(" ","");
  if(joined.length()>=4&&!hasDigit(joined)&&title.replace(" ","").contains(joined))return 1;
  var typed=new ArrayList<>(List.of(query.split(" ")));typed.sort(Comparator.comparingInt(String::length).reversed());
  var words=title.split(" ");var used=new boolean[words.length];double found=0;
  for(String word:typed){
   int at=-1;double best=0;
   for(int i=0;i<words.length;i++)if(!used[i]){double s=word(word,words[i]);if(s>best){best=s;at=i;}}
   if(at>=0){used[at]=true;found+=best*word.length();}
  }
  return found/joined.length()+EPSILON;
 }
 private static double word(String typed,String other){
  if(typed.equals(other))return 1;
  if(hasDigit(typed)||hasDigit(other))return 0;
  if(typed.length()>=2&&other.startsWith(typed))return 1;
  int shorter=Math.min(typed.length(),other.length()),longer=Math.max(typed.length(),other.length());
  if(shorter<4||shorter<0.75*longer)return 0;
  double s=1d-(double)distance(typed,other)/longer;
  return s>=0.75?s:0;
 }
 private static boolean hasDigit(String s){return s.chars().anyMatch(Character::isDigit);}
 private static int distance(String a,String b){
  int[] row=new int[b.length()+1];for(int j=0;j<row.length;j++)row[j]=j;
  for(int i=1;i<=a.length();i++){int diagonal=row[0];row[0]=i;for(int j=1;j<=b.length();j++){int old=row[j];row[j]=Math.min(Math.min(row[j]+1,row[j-1]+1),diagonal+(a.charAt(i-1)==b.charAt(j-1)?0:1));diagonal=old;}}
  return row[b.length()];
 }
}
