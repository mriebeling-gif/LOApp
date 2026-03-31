from app.models import Region

# 2026 baseline VA residual income table (loan amount >= $80,000), family size up to 5.
# Over 5 family members: add $80 for each additional member.
VA_RESIDUAL_INCOME_TABLE_2026: dict[Region, dict[int, int]] = {
    Region.northeast: {1: 450, 2: 755, 3: 909, 4: 1025, 5: 1062},
    Region.midwest: {1: 441, 2: 738, 3: 889, 4: 1003, 5: 1039},
    Region.south: {1: 441, 2: 738, 3: 889, 4: 1003, 5: 1039},
    Region.west: {1: 491, 2: 823, 3: 990, 4: 1117, 5: 1158},
}

ADDITIONAL_FAMILY_MEMBER_INCREMENT = 80
DTI_COMPENSATING_THRESHOLD = 41.0
DTI_RESIDUAL_MULTIPLIER = 1.2
