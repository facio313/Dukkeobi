package kr.or.forcewave;

import static org.junit.Assert.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;

import javax.inject.Inject;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.context.web.WebAppConfiguration;

import kr.or.forcewave.index.dao.IndexDAO;
import kr.or.forcewave.safety.dao.SafetyDAO;
import kr.or.forcewave.safety.vo.SafetyVO;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RunWith(SpringRunner.class)
@ContextConfiguration("file:webapp/WEB-INF/spring/*-context.xml")
@WebAppConfiguration
public class ApiTest {

	@Inject
	private SafetyDAO safetyDao;
	@Inject
	private IndexDAO indexDao;
	
	//@Test
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
	
	// @Test
	public void safetyTest() {
		List<SafetyVO> list = safetyDao.selectSafetyList();
		list.forEach(safety -> System.out.println(safety.getSafetyAddr()));
	}
	
	@Test
	public void xy() {
		Map<String, String> map = indexDao.selectXY("상암동");
		System.out.println(map.get("x"));
		System.out.println(map.get("y"));
	}
}
