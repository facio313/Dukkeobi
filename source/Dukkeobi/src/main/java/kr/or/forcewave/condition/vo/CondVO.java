package kr.or.forcewave.condition.vo;

import java.util.List;
import java.util.Map;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@ToString
public class CondVO {
	private int condNo;
	private String condNm;
	private String condEmd; // 지정동
	private int condRange; // 범위
	private String condDetails; // 세부조건
	private String condRe; // 주거유형
	private int condReRange1; // 보증금
	private int condReRange2; // 월세
	private String condDate;
	private String condDeleteDate;
	
	private Map<String, List<String>> detailMap;
}
