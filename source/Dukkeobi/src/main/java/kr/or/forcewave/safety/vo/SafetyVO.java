package kr.or.forcewave.safety.vo;

import javax.validation.constraints.NotBlank;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@ToString
public class SafetyVO {
	
	private int gid;
	@NotBlank
	private String safetySort;
	@NotBlank
	private String safetyGubun;
	@NotBlank
	private String safetyCode;
	@NotBlank
	private String safetyNm;
	@NotBlank
	private String safetyAddr;
	private String safetyEmd;
	private double safetyLon;
	private double safetyLat;
	private double safetyX;
	private double safetyY;
	
}
