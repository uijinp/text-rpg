#!/usr/bin/env python3
"""
Monster Image Batch Generator (Google Gemini / Imagen 3)
MONSTER_PROMPTS.md에서 프롬프트를 파싱하여 Gemini Imagen 3 API로 이미지 일괄 생성

사용법:
  # GEMINI_API_KEY 환경변수 설정 후 실행
  export GEMINI_API_KEY="AIza..."
  python3 generate_monsters.py

  # 특정 몬스터만 생성 (쉼표 구분)
  python3 generate_monsters.py --only goblin,wolf,dragon

  # 이미 생성된 이미지 덮어쓰기
  python3 generate_monsters.py --overwrite

  # dry-run (API 호출 없이 파싱만)
  python3 generate_monsters.py --dry-run
"""

import os
import re
import sys
import time
import argparse
from io import BytesIO
from pathlib import Path

try:
    from google import genai
    from google.genai import types
    from PIL import Image
except ImportError:
    print("필요한 패키지를 설치해주세요:")
    print("  pip install google-genai Pillow")
    sys.exit(1)


# ─── 설정 ───────────────────────────────────────────────
PROMPTS_FILE = Path(__file__).parent / "web" / "MONSTER_PROMPTS.md"
OUTPUT_DIR   = Path(__file__).parent / "web" / "monster_image"
RATE_LIMIT_SLEEP = 5   # Imagen 3: 비교적 여유로운 rate limit


def parse_prompts(md_path: Path) -> list[dict]:
    """MONSTER_PROMPTS.md에서 {key, name, prompt} 리스트 추출"""
    text = md_path.read_text(encoding="utf-8")

    # ### 1. goblin (고블린)  →  key=goblin, name=고블린
    header_pattern = re.compile(
        r"###\s+\d+\.\s+(\w+)\s+\(([^)]+)\)"
    )
    # ``` ... ``` 블록 안의 프롬프트
    code_block_pattern = re.compile(r"```\n(.*?)\n```", re.DOTALL)

    headers = list(header_pattern.finditer(text))
    blocks  = list(code_block_pattern.finditer(text))

    if len(headers) != len(blocks):
        print(f"⚠️  헤더({len(headers)})와 코드블록({len(blocks)}) 수 불일치")

    monsters = []
    for h, b in zip(headers, blocks):
        monsters.append({
            "key":    h.group(1),
            "name":   h.group(2),
            "prompt": b.group(1).strip(),
        })
    return monsters


def generate_image_imagen(client, prompt: str) -> bytes:
    """Imagen 4 Fast API 호출 → PNG bytes 반환"""
    response = client.models.generate_images(
        model="imagen-4.0-fast-generate-001",
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type="image/png",
        ),
    )
    return response.generated_images[0].image.image_bytes


def save_as_webp(png_bytes: bytes, out_path: Path, resize: int = None):
    """PNG bytes → WebP 파일로 저장 (선택적 리사이즈)"""
    img = Image.open(BytesIO(png_bytes))
    if resize:
        img = img.resize((resize, resize), Image.LANCZOS)
    img.save(out_path, format="WEBP", quality=90)


def main():
    parser = argparse.ArgumentParser(description="몬스터 이미지 일괄 생성 (Gemini Imagen 3)")
    parser.add_argument("--only", type=str, default="",
                        help="특정 몬스터만 생성 (쉼표 구분, 예: goblin,wolf)")
    parser.add_argument("--overwrite", action="store_true",
                        help="이미 존재하는 이미지도 다시 생성")
    parser.add_argument("--size", type=int, default=1024,
                        help="최종 이미지 크기 (기본: 1024). 512 지정 시 리사이즈")
    parser.add_argument("--dry-run", action="store_true",
                        help="실제 API 호출 없이 파싱 결과만 출력")
    args = parser.parse_args()

    # 프롬프트 파싱
    if not PROMPTS_FILE.exists():
        print(f"❌ 프롬프트 파일을 찾을 수 없습니다: {PROMPTS_FILE}")
        sys.exit(1)

    monsters = parse_prompts(PROMPTS_FILE)
    print(f"📋 총 {len(monsters)}개 몬스터 프롬프트 파싱 완료\n")

    # 필터링
    if args.only:
        only_keys = set(args.only.split(","))
        monsters = [m for m in monsters if m["key"] in only_keys]
        print(f"🎯 선택된 몬스터: {[m['key'] for m in monsters]}\n")

    if not monsters:
        print("생성할 몬스터가 없습니다.")
        return

    # dry-run
    if args.dry_run:
        for i, m in enumerate(monsters, 1):
            print(f"  {i:2d}. {m['key']:25s} ({m['name']})")
        print(f"\n총 {len(monsters)}개")
        print(f"예상 소요 시간: ~{max(1, len(monsters) * RATE_LIMIT_SLEEP // 60)}분")
        return

    # API 키 확인
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY 환경변수를 설정해주세요.")
        print("   export GEMINI_API_KEY='AIza...'")
        print("\n   Google AI Studio에서 발급: https://aistudio.google.com/apikey")
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    resize_to = args.size if args.size != 1024 else None

    # 생성 루프
    total = len(monsters)
    success = 0
    failed = []

    print(f"🚀 {total}개 몬스터 이미지 생성 시작 (Imagen 3)\n")

    for i, m in enumerate(monsters, 1):
        out_path = OUTPUT_DIR / f"{m['key']}.webp"

        # 스킵 체크
        if out_path.exists() and not args.overwrite:
            print(f"  [{i}/{total}] ⏭️  {m['key']} ({m['name']}) — 이미 존재, 스킵")
            success += 1
            continue

        print(f"  [{i}/{total}] 🎨 {m['key']} ({m['name']}) 생성 중...", end="", flush=True)

        try:
            png_bytes = generate_image_imagen(client, m["prompt"])
            save_as_webp(png_bytes, out_path, resize=resize_to)

            size_kb = out_path.stat().st_size / 1024
            print(f" ✅ ({size_kb:.0f}KB)")
            success += 1

        except Exception as e:
            print(f" ❌ 에러: {e}")
            failed.append(m["key"])

        # Rate limit 대기 (마지막이 아닌 경우)
        if i < total:
            time.sleep(RATE_LIMIT_SLEEP)

    # 결과 요약
    print(f"\n{'='*50}")
    print(f"✅ 성공: {success}/{total}")
    if failed:
        print(f"❌ 실패: {len(failed)}개 — {failed}")
        print(f"\n실패한 몬스터만 재시도:")
        print(f"  python3 generate_monsters.py --only {','.join(failed)}")
    print(f"\n📁 저장 위치: {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
