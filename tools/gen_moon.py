import json, sys, numpy as np
from PIL import Image
rng = np.random.default_rng(42)
W, H = 4096, 2048
lon = (np.arange(W) + .5) / W * 360 - 180; lat = 90 - (np.arange(H) + .5) / H * 180
LON, LAT = np.meshgrid(np.radians(lon), np.radians(lat))
# --- Relief procédural : bruit fractal + cratères (loi de puissance) + cratères polaires nommés ---
def noise(scale_w, scale_h, amp):
    g = rng.random((scale_h, scale_w)); im = Image.fromarray((g * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    return (np.asarray(im, np.float32) / 255 - .5) * amp
height = sum(noise(16 * 2**k, 8 * 2**k, 1.0 / 2**k) for k in range(6)).astype(np.float32) * 0.6
named = json.load(open(sys.argv[1]))
craters = [(c['lat'], c['lon'], c['d'] / 2 / 30.3, True) for c in named]  # rayon en degrés (1° ≈ 30,3 km)
for _ in range(25000):
    r = 0.07 * (1 - rng.random()) ** (-0.75); r = min(r, 4.2)
    craters.append((np.degrees(np.arcsin(rng.uniform(-1, 1))), rng.uniform(-180, 180), r, False))
psr = np.zeros((H, W), np.float32); alb = np.zeros((H, W), np.float32)
for la, lo, r, isnamed in craters:
    cl = max(np.cos(np.radians(la)), 0.03); rx = min(180, r * 1.6 / cl); ry = r * 1.6
    j0, j1 = int((90 - (la + ry)) / 180 * H), int((90 - (la - ry)) / 180 * H) + 1
    j0, j1 = max(0, j0), min(H, j1)
    if j1 <= j0: continue
    i0 = int((lo - rx + 180) / 360 * W); i1 = int((lo + rx + 180) / 360 * W) + 1
    cols = np.arange(i0, i1) % W
    sub_lat = lat[j0:j1][:, None]; sub_lon = lon[cols][None, :]
    dlon = (sub_lon - lo + 180) % 360 - 180
    dx = dlon * np.cos(np.radians(sub_lat)); dy = sub_lat - la
    d = np.sqrt(dx * dx + dy * dy) / r
    depth = 0.9 if isnamed else 0.55
    prof = np.where(d < 1, -depth * (1 - d * d) + 0.25, 0) + 0.35 * np.exp(-((d - 1) / 0.18) ** 2)
    height[j0:j1, cols] += (prof * min(1.5, 0.35 + r)).astype(np.float32)
    alb[j0:j1, cols] += (np.where(d < 0.8, -0.035, 0) + 0.028 * np.exp(-((d - 1) / 0.2) ** 2) * (0.6 + rng.random())).astype(np.float32)
    if isnamed: psr[j0:j1, cols] = np.maximum(psr[j0:j1, cols], (d < 0.85).astype(np.float32))
# Ombrage (soleil rasant, comme aux pôles)
gy, gx = np.gradient(height); gx = gx / np.maximum(np.cos(LAT), 0.05)
shade = np.clip(0.55 + 2.2 * (-gx * 0.8 + gy * 0.6), 0, 1)
albedo = 0.64 + 0.10 * noise(48, 24, 1.0) + 0.05 * noise(256, 128, 1.0) + alb
proc = np.clip(albedo * (0.86 + 0.28 * shade), 0, 1)
proc *= 1 - 0.55 * psr  # planchers en ombre permanente
# --- Face visible : photo NASA, projection orthographique exacte ---
ph = np.asarray(Image.open(sys.argv[2]).convert('L'), np.float32) / 255
cx, cy, R = 1014.0, 959.5, 757.0
X = np.cos(LAT) * np.sin(LON); Y = np.sin(LAT); cosang = np.cos(LAT) * np.cos(LON)
px = np.clip(cx + R * X, 0, ph.shape[1] - 1).astype(int); py = np.clip(cy - R * Y, 0, ph.shape[0] - 1).astype(int)
photo = ph[py, px]; photo = (photo - np.percentile(photo, 1)) / (np.percentile(photo, 99.5) - np.percentile(photo, 1))
photo = np.clip(photo, 0, 1) ** 1.25 * 0.92 + 0.04
w = np.clip((cosang - 0.35) / 0.40, 0, 1) * (np.abs(np.degrees(LAT)) < 72)
w = np.asarray(Image.fromarray((w * 255).astype(np.uint8)).filter(__import__('PIL.ImageFilter', fromlist=['x']).GaussianBlur(30)), np.float32) / 255
core = w > 0.95; hi = photo[core]; ref = np.percentile(hi, 70)
photo = photo * (np.mean(proc[~core]) / max(ref, 1e-3))
detail = (shade - 0.55) * 0.18
col = w * np.clip(photo + detail * 0.5, 0, 1) + (1 - w) * proc
rgb = np.stack([col * 0.985, col * 0.975, col * 0.955], -1)
Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).save(sys.argv[3], quality=84, optimize=True)
hn = (height - height.min()) / (np.ptp(height)); Image.fromarray((hn * 255).astype(np.uint8)).resize((2048, 1024), Image.BILINEAR).save(sys.argv[4], quality=88)
Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).resize((1024, 512)).save(sys.argv[5])
print('ok', W, H)
