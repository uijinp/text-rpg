"""공통 헬퍼 함수 + game_over"""


def _set_location(player, key):
    """현재 위치를 설정하고 방문 기록에 추가"""
    player.current_location = key
    if not hasattr(player, "visited_locations"):
        player.visited_locations = set()
    player.visited_locations.add(key)


# ─── 헬퍼 ──────────────────────────────────────────────
def _input_choice(options):
    while True:
        try:
            c = int(input("  선택: "))
            if c in options:
                return c
        except ValueError:
            pass
        print(f"  {sorted(options)} 중 하나를 입력하세요.")


def _divider(title=""):
    if title:
        pad = max(0, (46 - len(title)) // 2)
        print(f"\n{'─'*pad} {title} {'─'*pad}")
    else:
        print("\n" + "─" * 50)


def _pause():
    input("\n  [엔터를 눌러 계속...]")


# ═══════════════════════════════════════════════════════
#  게임 오버
# ═══════════════════════════════════════════════════════
def game_over(player):
    print("\n" + "✕" * 50)
    print(f"""
  {player.name}은(는) 쓸쓸히 눈을 감았다.

  ─ GAME OVER ─
  도달 레벨: {player.level}  /  어둠 점수: {player.dark_points}
""")
    print("✕" * 50)
    return "gameover"
