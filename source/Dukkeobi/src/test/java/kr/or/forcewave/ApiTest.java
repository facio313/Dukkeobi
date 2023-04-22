package kr.or.forcewave;

import static org.junit.Assert.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

import org.junit.Test;

public class ApiTest {

	@Test
	public void test() {
       try {
            // API 호출 URL
            String urlStr = "https://www.safemap.go.kr/openApiService/data/getCrmnlHspotFETotData.do?serviceKey=H007VLYZ-H007-H007-H007-H007VLYZRB&pageNo=1&numOfRows=10&type=JSON";
            
            URL url = new URL(urlStr);
            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("GET");

            BufferedReader br = new BufferedReader(new InputStreamReader(con.getInputStream()));
            String line;
            StringBuilder sb = new StringBuilder();

            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
            br.close();

            // 받아온 XML 데이터 출력
            System.out.println(sb.toString());
            
        } catch (Exception e) {
            e.printStackTrace();
        }

	}

}