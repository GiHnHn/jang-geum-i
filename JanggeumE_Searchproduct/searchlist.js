import dotenv from 'dotenv';
import readline from 'readline';
import open from 'open'; // 브라우저로 링크 열기

// 네이버 API 키
dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// 사용자 입력받기
rl.question('검색어를 입력하세요: ', (searchQuery) => {
    if (!searchQuery) {
        console.log('검색어가 입력되지 않았습니다.');
        rl.close();
        return;
    }

    // 네이버 쇼핑 검색 결과 페이지 URL 생성
    const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(searchQuery)}`;

    // 브라우저에서 검색 결과 리스트 페이지 열기
    open(searchUrl)
        .then(() => {
            console.log(`브라우저에서 네이버 쇼핑 검색 결과를 열었습니다: ${searchUrl}`);
        })
        .catch(err => {
            console.error('브라우저에서 링크를 열 수 없습니다:', err);
        });

    rl.close(); // 입력 종료
});
