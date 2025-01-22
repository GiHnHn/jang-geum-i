// 네이버 검색 API를 활용하여 제품 검색하기.
// 검색 결과 상위 5개 JSON 획득 후 최상위 1개 링크 접속

import dotenv from 'dotenv';
import readline from 'readline';
import request from 'request';
import fs from 'fs';
import path from 'path';
import open from 'open'; // 브라우저로 링크 열기
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// 네이버 API 키
dotenv.config();

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

// readline 인터페이스 설정, 사용자가 검색어 입력하게 하기 위해 필요.
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// searchrecord 디렉토리 설정
const searchRecordDir = path.join(__dirname, 'searchrecord');

// 디렉토리 존재 여부 확인 및 생성
if (!fs.existsSync(searchRecordDir)) {
    fs.mkdirSync(searchRecordDir, { recursive: true });
    console.log(`[INFO] searchrecord 디렉토리를 생성했습니다.`);
}

// 사용자 입력받기
rl.question('검색어를 입력하세요: ', (searchQuery) => {
    if (!searchQuery) {
        console.log('검색어가 입력되지 않았습니다.');
        rl.close();
        return;
    }

    const api_url = 'https://openapi.naver.com/v1/search/shop?query=' + encodeURI(searchQuery); // JSON 결과
    const options = {
        url: api_url,
        headers: { 
            'X-Naver-Client-Id': client_id,
            'X-Naver-Client-Secret': client_secret,
        },
    };

    // 네이버 API 호출
    request.get(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // JSON 응답 데이터 추출
            const jsonData = JSON.parse(body);

            // smartstore.naver.com이 포함된 상품만 필터링
            const filteredItems = jsonData.items.filter(item => item.link.includes('smartstore.naver.com')).slice(0, 5);

            if (filteredItems.length > 0) {
                console.log(`검색 결과 (smartstore.naver.com 포함, 최대 5개):`);

                // 필터링된 검색 결과 출력
                filteredItems.forEach((item, index) => {
                    console.log(`${index + 1}. ${item.title}`);
                    console.log(`   링크: ${item.link}`);
                });

                // 첫 번째 상품 링크 열기
                const firstProductLink = filteredItems[0].link;
                console.log(`\n첫 번째 상품 링크: ${firstProductLink}`);

                open(firstProductLink)
                    .then(() => {
                        console.log('브라우저에서 첫 번째 상품 링크가 열렸습니다.');
                    })
                    .catch(err => {
                        console.error('브라우저에서 링크를 열 수 없습니다:', err);
                    });

                 // 검색 결과를 JSON 파일로 저장
                 const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15); // YYYYMMDDHHMMSS 형식
                 const filePath = path.join(searchRecordDir, `${searchQuery}_${timestamp}.json`);
 
                 fs.writeFile(filePath, JSON.stringify(filteredItems, null, 2), (err) => {
                     if (err) {
                         console.error('[ERROR] 검색 결과 저장 중 오류가 발생했습니다:', err.message);
                     } else {
                         console.log(`[INFO] 검색 결과를 ${filePath}에 저장했습니다.`);
                     }
                 });

            } else {
                console.log('smartstore.naver.com을 포함하는 검색 결과가 없습니다.');
            }
        } else {
            console.log(`API 요청 실패: 상태 코드 ${response.statusCode}`);
        }

        rl.close(); // 입력 종료
    });
});
