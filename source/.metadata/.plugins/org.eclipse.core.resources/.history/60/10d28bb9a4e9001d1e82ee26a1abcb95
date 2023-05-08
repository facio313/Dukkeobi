package kr.or.forcewave.spatial.vo;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@ToString
public class ResultVO {
	private int resultNo;
	private int condNo;
	private String safetySort;
	private String danji;
	private String bdMgtSn;
	private int cnt;
	private String date;
	private String deleteDate;
	
	private int rank;
	private int totalScore;
	private double totalAvg;
	
	// t점수
	private double publicScore;
	private double eduScore;
	private double healthScore;
	private double conviScore;
	private double safeScore;
	private double natureScore;

	// 분석 결과 정보
	private String addr;
	private String re;
	private int reRange1;
	private int reRange2;
	private String subways;
	private String convis;
	private String hospitals;
	
	public void setTotalScore() {
		int total = 0;
		int flag = 0;
		if (this.publicScore != 0) {
			total += this.publicScore;
			flag += 1;
		}
		if (this.eduScore != 0) {
			total += this.eduScore;
			flag += 1;
		}
		if (this.healthScore != 0) {
			total += this.healthScore;
			flag += 1;
		}
		if (this.conviScore != 0) {
			total += this.conviScore;
			flag += 1;
		}
		if (this.safeScore != 0) {
			total += this.safeScore;
			flag += 1;
		}
		if (this.natureScore != 0) {
			total += this.natureScore;
			flag += 1;
		}
		this.totalScore = total;
		this.totalAvg = (double) total/flag;
	}

//	private List<SafetyVO> safetyList;

	
	
	/*
	public void setScore() {
		if (this.safetySort.equals("public")) {
			this.publicScore = this.cnt;
		} else if (this.safetySort.equals("edu")) {
			this.eduScore = this.cnt;
		} else if (this.safetySort.equals("health")) {
			this.healthScore = this.cnt;
		} else if (this.safetySort.equals("convi")) {
			this.conviScore = this.cnt;
		} else if (this.safetySort.equals("safe")) {
			this.safeScore = this.cnt;
		} else if (this.safetySort.equals("nature")) {
			this.natureScore = this.cnt;
		}
	}
	*/
}
