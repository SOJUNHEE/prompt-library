# 프롬프트 서랍

공개 라이선스 AI 프롬프트 2,796개를 검색하고, 빈칸을 채워 바로 복사하는 정적 사이트입니다.

- prompts.chat 프롬프트 2,531개 (CC0 1.0)
- Fabric patterns 265개 (MIT)

## 파일 구조

```
index.html      메인 화면
about.html      출처와 라이선스
style.css       스타일
app.js          검색·필터·상세·복사
data/index.json 목록용 요약 데이터
data/full.json  프롬프트 본문 (index.json과 같은 순서)
licenses/       원본 라이선스 전문
vercel.json     Vercel 설정
```

## 로컬에서 보기

VS Code의 Live Server로 `index.html`을 열거나, 이 폴더에서 `python -m http.server`를 실행한 뒤 http://localhost:8000 으로 접속하세요. (파일을 더블클릭해서 열면 데이터 불러오기가 막혀요.)

## 배포

빌드 과정이 없는 정적 사이트라 Vercel에서 이 저장소를 Import한 뒤 Framework Preset을 "Other"로 두고 Deploy하면 됩니다.
