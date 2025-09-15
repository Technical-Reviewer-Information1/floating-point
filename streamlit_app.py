import streamlit as st

st.set_page_config(page_title="浮動小数点数", layout="wide")

def decimal_to_binary_integer(num):
    """整数部分を2進数に変換"""
    if num == 0:
        return "0"
    binary = ""
    while num > 0:
        binary = str(num % 2) + binary
        num = num // 2
    return binary

def decimal_to_binary_fraction(frac, max_digits=20):
    """小数部分を2進数に変換"""
    if frac == 0:
        return "0"
    binary = ""
    for _ in range(max_digits):
        frac *= 2
        if frac >= 1:
            binary += "1"
            frac -= 1
        else:
            binary += "0"
        if frac == 0:
            break
    return binary

def binary_to_decimal_fraction(binary_str):
    """2進数の小数を10進数に変換"""
    decimal = 0
    for i, bit in enumerate(binary_str):
        if bit == '1':
            decimal += 2 ** (-(i + 1))
    return decimal

def normalize_binary(binary_str):
    """2進数を正規化（1.xxxxx × 2^n の形に変換）"""
    if '.' in binary_str:
        integer_part, fraction_part = binary_str.split('.')
        full_binary = integer_part + fraction_part
    else:
        full_binary = binary_str
        
    # 最初の1を見つける
    first_one = full_binary.find('1')
    if first_one == -1:
        return "0", 0
    
    # 正規化
    if '.' in binary_str:
        exponent = len(integer_part) - 1 - first_one
    else:
        exponent = len(full_binary) - 1 - first_one
    
    # 1.xxxxx の形を作成
    mantissa_bits = full_binary[first_one + 1:]
    
    return mantissa_bits, exponent

st.title("浮動小数点数（pp.148-150）")
st.caption("Created by Dit-Lab.(Daiki ITO)")
st.caption("Supported by Tomoaki ATSUMI")

st.markdown("---")

# パート1: 10進数 → 浮動小数点数
st.header("パート1：10進数を浮動小数点数に変えてみよう ⚙️")
st.write("10進数（小数）がコンピュータ内部でどのように表現されるかを体験してみましょう！")

# 重要な注意事項を強調
st.warning("⚠️ **重要**: この浮動小数点数表現では、16ビット形式を使用し、**仮数部のみを格納します**（先頭の整数部分「1.」は省略されます）")

# 入力
input_number = st.number_input("🔢 好きな小数を入力してください", value=-14, step=1)

st.info(f"📋 今回変換する数値: **{input_number}**")

st.subheader("📍 ステップ1: 符号部 (S) を決める")
if input_number >= 0:
    sign_bit = 0
    st.metric(label="入力された数値", value=f"{input_number}", delta="正の数")
    st.success("符号部 (S): 0")
    st.write("正の数なので、符号部は「0」になります。")
else:
    sign_bit = 1
    st.metric(label="入力された数値", value=f"{input_number}", delta="負の数")
    st.success("符号部 (S): 1")
    st.write("負の数なので、符号部は「1」になります。")

st.subheader("🔄 ステップ2: 全体を2進数に変換する")
abs_number = abs(input_number)
integer_part = int(abs_number)
fraction_part = abs_number - integer_part

# 整数部分の変換
integer_binary = decimal_to_binary_integer(integer_part)
st.write(f"整数部分: {integer_part} → {integer_binary}")

# 小数部分の変換
fraction_binary = decimal_to_binary_fraction(fraction_part)
st.write(f"小数部分: {fraction_part} → 0.{fraction_binary}")

# 結合
full_binary = f"{integer_binary}.{fraction_binary}"

# 視覚的に分かりやすく表示
col1, col2 = st.columns([1, 1])
with col1:
    st.write("**整数部分**")
    st.code(integer_binary, language="text")
with col2:
    st.write("**小数部分**")
    st.code(f"0.{fraction_binary}", language="text")

st.write("**結合した2進数:**")
st.code(full_binary, language="text")
st.success("✅ 入力された数値を2進数に変換しました。")

st.subheader("🎯 ステップ3: 正規化して、指数と仮数を探す")
mantissa_bits, exponent = normalize_binary(full_binary)

normalized_form = f"1.{mantissa_bits} × 2^{exponent}"

# 変換過程を視覚的に表示
st.write("**正規化の過程:**")
col1, col2, col3 = st.columns([2, 1, 2])
with col1:
    st.code(full_binary, language="text")
with col2:
    st.write("➡️")
with col3:
    st.code(normalized_form, language="text")

# 結果を色分けして表示
col1, col2 = st.columns(2)
with col1:
    st.info(f"📊 指数: **{exponent}**")
with col2:
    st.info(f"🔢 仮数のもと: **{mantissa_bits}**")

st.success("✅ 小数点の位置を調整し、「指数」と「仮数」を見つけました。")

st.subheader("⚡ ステップ4: 指数部 (E) を計算する")
bias = 15  # 16ビット浮動小数点数のバイアス値
biased_exponent = exponent + bias
exponent_binary = decimal_to_binary_integer(biased_exponent).zfill(5)

# 計算過程を段階的に表示
st.write("**計算過程:**")
st.code(f"{exponent} (指数) + {bias} (バイアス) = {biased_exponent}", language="text")

st.write("**10進数から2進数への変換:**")
st.code(f"{biased_exponent} → {exponent_binary}", language="text")

st.success(f"✅ 指数部 (E): **{exponent_binary}**")
st.info("💡 指数に「バイアス」と呼ばれる固定値を足して、負の指数も正の数として表現できるようにします。")

st.subheader("🎨 ステップ5: 仮数部 (M) を整形する")
mantissa_10bit = mantissa_bits[:10].ljust(10, '0')

# 仮数の処理過程を詳しく表示
st.write("**仮数の整形過程:**")
st.write(f"元の仮数: `{mantissa_bits}`")

if len(mantissa_bits) > 10:
    st.write(f"10ビットに切り詰め: `{mantissa_bits[:10]}`")
elif len(mantissa_bits) < 10:
    st.write(f"10ビットまで0で埋める: `{mantissa_10bit}`")
else:
    st.write("ちょうど10ビットです")

st.code(mantissa_10bit, language="text")
st.success(f"✅ 仮数部 (M): **{mantissa_10bit}**")

st.warning("⚠️ **重要**: 浮動小数点数では、正規化により先頭の「1.」は省略され、**小数部分のみ**が仮数として格納されます！")

st.subheader("🎉 完成した16ビット浮動小数点数")

# より視覚的な表示
col1, col2, col3 = st.columns(3)
with col1:
    with st.container():
        st.markdown("### 📍 符号部 (S)")
        st.markdown("**1ビット**")
        st.success(f"**{sign_bit}**")
        if sign_bit == 0:
            st.write("✅ 正の数")
        else:
            st.write("⚠️ 負の数")

with col2:
    with st.container():
        st.markdown("### ⚡ 指数部 (E)")
        st.markdown("**5ビット**")
        st.success(f"**{exponent_binary}**")
        st.write(f"実際の指数: {exponent}")

with col3:
    with st.container():
        st.markdown("### 🎨 仮数部 (M)")
        st.markdown("**10ビット**")
        st.success(f"**{mantissa_10bit}**")
        st.write("小数部分のみ")

final_result = f"{sign_bit} {exponent_binary} {mantissa_10bit}"
st.markdown("### 🔗 最終結果")
st.code(final_result, language="text")

st.markdown("---")

# パート2: 浮動小数点数 → 10進数
st.header("パート2：浮動小数点数を10進数に戻してみよう 🔬")
st.write("今度は逆の変換を体験してみましょう！浮動小数点数から10進数へ変換します。")

# 重要な注意事項を再度強調
st.warning("⚠️ **重要**: 仮数部は**小数部分のみ**です。先頭の「1.」は自動的に補完されます！")

# 入力
st.write("🔢 各部分を入力してください:")
col1, col2, col3 = st.columns(3)
with col1:
    st.write("**📍 符号部 (S)**")
    input_s = st.text_input("1ビット", value="0", max_chars=1, help="0=正の数, 1=負の数")
with col2:
    st.write("**⚡ 指数部 (E)**")
    input_e = st.text_input("5ビット", value="01110", max_chars=5, help="バイアス付きの指数")
with col3:
    st.write("**🎨 仮数部 (M)**")
    input_m = st.text_input("10ビット", value="1100000000", max_chars=10, help="小数部分のみ（1.は省略）")

st.subheader("📋 ステップ1: 各パーツを読み解く")
st.write(f"符号部 (S): {input_s}")
st.write(f"指数部 (E): {input_e}")
st.write(f"仮数部 (M): {input_m}")

st.subheader("📍 ステップ2: 符号 (S) を確認する")
if input_s == "0":
    st.info("符号は「正」です。")
    final_sign = 1
else:
    st.info("符号は「負」です。")
    final_sign = -1

st.subheader("⚡ ステップ3: 指数 (E) を元に戻す")
try:
    exponent_decimal = int(input_e, 2)
    actual_exponent = exponent_decimal - bias
    st.write(f"指数部 (E): {input_e} (2進数) → {exponent_decimal} (10進数)")
    st.write(f"計算式: {exponent_decimal} - {bias} (バイアス) = {actual_exponent}")
    st.success(f"実際の指数: {actual_exponent}")
except ValueError:
    st.error("指数部は2進数で入力してください（0と1のみ）")
    actual_exponent = 0

st.subheader("🎨 ステップ4: 仮数 (M) を元に戻す")
restored_mantissa = f"1.{input_m}"

# 復元過程を視覚的に表示
st.write("**仮数の復元過程:**")
col1, col2, col3 = st.columns([2, 1, 2])
with col1:
    st.write("格納されている仮数部:")
    st.code(input_m, language="text")
with col2:
    st.write("➕")
    st.write("先頭の1")
with col3:
    st.write("復元された完全な仮数:")
    st.code(restored_mantissa, language="text")

st.success("✅ 省略されていた先頭の「1.」を付け加えました。")
st.info("💡 浮動小数点数では、正規化により先頭は必ず「1」になるため、この部分は省略して格納されています。")

st.subheader("🔧 ステップ5: すべてを結合して計算する")
st.write(f"{restored_mantissa} × 2^{actual_exponent}")

# 小数点位置の調整
if actual_exponent >= 0:
    # 右にシフト
    integer_part = "1" + input_m[:actual_exponent].ljust(actual_exponent, '0')
    fraction_part = input_m[actual_exponent:]
    result_binary = f"{integer_part}.{fraction_part}" if fraction_part else integer_part
else:
    # 左にシフト
    zeros_to_add = abs(actual_exponent) - 1
    fraction_part = "0" * zeros_to_add + "1" + input_m
    result_binary = f"0.{fraction_part}"

st.write(f"結果: {result_binary} (2進数)")

# 10進数に変換
try:
    if '.' in result_binary:
        integer_part, fraction_part = result_binary.split('.')
        decimal_result = int(integer_part, 2) + binary_to_decimal_fraction(fraction_part)
    else:
        decimal_result = int(result_binary, 2)
    
    decimal_result *= final_sign
    
    # 計算過程を表示
    if '.' in result_binary:
        integer_part, fraction_part = result_binary.split('.')
        st.write("**2進数から10進数への変換過程:**")
        
        if integer_part != "0":
            st.write(f"整数部分: {integer_part} = {int(integer_part, 2)}")
        
        if fraction_part and fraction_part.strip('0'):
            st.write("小数部分:")
            fraction_calc = []
            for i, bit in enumerate(fraction_part):
                if bit == '1':
                    power = -(i + 1)
                    value = 2 ** power
                    fraction_calc.append(f"{bit}×(1/2^{i+1}) = {value}")
            
            st.write(" + ".join(fraction_calc))
            frac_sum = sum(2**(-(i+1)) for i, bit in enumerate(fraction_part) if bit == '1')
            st.write(f"= {frac_sum}")
    
except ValueError:
    st.error("変換中にエラーが発生しました。")
    decimal_result = 0

st.subheader("🎉 完成した10進数")
st.success(f"**{decimal_result}**")

st.markdown("---")
st.markdown("### 📚 学習のポイント")

with st.expander("🔍 浮動小数点数の構造", expanded=True):
    st.write("- **符号部**: 数値の正負を表現（1ビット）")
    st.write("- **指数部**: 小数点の位置を表現（5ビット、バイアス付き）")
    st.write("- **仮数部**: 数値の精度を表現（10ビット、先頭の1は省略）")

with st.expander("⚠️ 重要な特徴"):
    st.error("**仮数部は小数部分のみ**: 正規化により先頭の「1.」は必ず省略されます")
    st.warning("**精度の限界**: 限られたビット数のため、全ての10進数を正確に表現できません")
    st.info("**バイアス値**: 負の指数も正の数として扱うことで、効率的な比較が可能です")

with st.expander("🎯 実用的な応用"):
    st.write("- CPUやGPUでの高速な浮動小数点演算")
    st.write("- 科学計算や3Dグラフィックスでの数値表現")
    st.write("- メモリ効率を重視するシステムでの利用")
