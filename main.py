"""텍스트 RPG - 메인 엔트리"""

import sys

# 윈도우 터미널 UTF-8 출력 설정
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

from character import create_player
from story import open_world_loop
import save_manager


def _run_game(player):
    result = open_world_loop(player)
    print("\n  다시 플레이하시겠습니까?")
    again = input("  (y/n): ").strip().lower()
    return again == "y"


def _new_game():
    player = create_player()

    # 캐릭터 생성 직후 저장 여부 묻기
    print("\n  새 캐릭터를 저장하시겠습니까?")
    if input("  (y/n): ").strip().lower() == "y":
        save_manager.prompt_save(player, "게임 시작 (성당 앞)")

    return _run_game(player)


def _load_game():
    player = save_manager.prompt_load()
    if not player:
        return True  # 취소 → 메인 메뉴로
    return _run_game(player)


def main():
    print("""
╔══════════════════════════════════════╗
║       ★  텍스트 RPG  ★              ║
║    어둠의 마왕을 물리쳐라!           ║
╚══════════════════════════════════════╝
""")

    while True:
        # 세이브 여부에 따라 메뉴 동적 구성
        menu = {"1": "new"}
        lines = ["  1. 새 게임 시작"]
        n = 2
        if save_manager.has_any_save():
            menu[str(n)] = "load"
            lines.append(f"  {n}. 이어서 하기")
            n += 1
        menu[str(n)] = "quit"
        lines.append(f"  {n}. 종료")

        for line in lines:
            print(line)

        cmd = input("  선택: ").strip()
        action = menu.get(cmd)

        if action == "new":
            keep_playing = _new_game()
            if not keep_playing:
                break
        elif action == "load":
            keep_playing = _load_game()
            if not keep_playing:
                break
        elif action == "quit":
            break
        else:
            print(f"  올바른 번호를 입력하세요.")

    print("\n  플레이해 주셔서 감사합니다!")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n  게임을 종료합니다.")
        sys.exit(0)
