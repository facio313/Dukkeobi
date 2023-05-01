package kr.or.forcewave.condition.vo;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@ToString
public class CondDetailVO {
	private String condSn;
	private String sort;
	private String cdDate;
	private String cdDeleteDate;
}
