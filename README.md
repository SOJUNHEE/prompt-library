# 프롬프트 서랍

프롬프트 엔지니어링 DAY 1~3 수업 정리 노트와 APE 프롬프트 생성기, 공개 라이선스 프롬프트 모음을 담은 정적 사이트입니다.

## 페이지

| 주소 | 내용 |
|---|---|
| `/` (index.html) | 공개 프롬프트 모음 2,784개 (prompts.chat CC0, Fabric MIT) + 한글 제목·설명 |
| `/notes` (notes.html) | 수업 정리 노트: 기법 30개 설명 + 예시 프롬프트 174개(복사 버튼) + APE 프롬프트 생성기 |
| `/about` (about.html) | 출처와 라이선스 |

## 파일 구조

```
index.html            첫 화면: 공개 프롬프트 모음
style.css, app.js     프롬프트 모음 스타일과 동작
index.json            목록 데이터 (영어 제목, 한글 제목 kt, 한글 설명 kd 등)
full.json             프롬프트 본문 (index.json과 같은 순서)
notes.html            수업 정리 노트 화면
notes.css             정리 노트 스타일 (반응형, 모바일은 ☰ 메뉴)
notes.js              정리 노트 내용 (기법 설명 + 수업 예시 프롬프트)
main.js               목차, 검색, 복사, 생성기
about.html            출처와 라이선스
*.txt                 라이선스 전문
vercel.json           Vercel 설정
```

## 생성기

- 기본: API 키 없이 수업의 APE 틀에 작업 3줄을 넣어 완성 프롬프트를 만들고, 복사해서 Claude나 Gemini에 붙여 넣습니다.
- 선택: 내 OpenAI API 키를 화면에 입력하면 바로 결과를 받습니다. 키는 저장하지 않고 코드에도 넣지 않습니다.

## 로컬에서 보기

VS Code의 Live Server로 `index.html`을 열거나, 이 폴더에서 `python -m http.server`를 실행한 뒤 http://localhost:8000 으로 접속하세요.

## 배포

빌드 과정이 없는 정적 사이트입니다. GitHub에 push하면 연결된 Vercel이 자동으로 다시 배포합니다.
