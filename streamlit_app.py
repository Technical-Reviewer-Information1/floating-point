import streamlit as st

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

st.title("浮動小数点数")
st.caption("Created by Dit-Lab.(Daiki ITO)")
st.caption("Supported by Tomoaki ATSUMI")

st.markdown("---")

# パート1: 10進数 → 浮動小数点数
st.header("パート1：10進数を浮動小数点数に変えてみよう ⚙️")
st.write("10進数（小数）がコンピュータ内部でどのように表現されるかを体験してみましょう！")

# 入力
input_number = st.number_input("好きな小数を入力してください", value=-14.625, step=0.001, format="%.3f")

st.subheader("ステップ1: 符号部 (S) を決める")
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

st.subheader("ステップ2: 全体を2進数に変換する")
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
st.code(full_binary, language="text")
st.write("入力された数値を2進数に変換しました。")

st.subheader("ステップ3: 正規化して、指数と仮数を探す")
mantissa_bits, exponent = normalize_binary(full_binary)

normalized_form = f"1.{mantissa_bits} × 2^{exponent}"
st.write(f"{full_binary} → {normalized_form}")
st.info(f"指数: {exponent}")
st.info(f"仮数のもと: {mantissa_bits}")
st.write("小数点の位置を調整し、「指数」と「仮数」を見つけました。")

st.subheader("ステップ4: 指数部 (E) を計算する")
bias = 15  # 16ビット浮動小数点数のバイアス値
biased_exponent = exponent + bias
exponent_binary = decimal_to_binary_integer(biased_exponent).zfill(5)

st.write(f"計算式: {exponent} (指数) + {bias} (バイアス) = {biased_exponent}")
st.write(f"2進数へ変換: {biased_exponent} → {exponent_binary}")
st.success(f"指数部 (E): {exponent_binary}")
st.write("指数に「バイアス」と呼ばれる固定値を足して、2進数に変換します。")

st.subheader("ステップ5: 仮数部 (M) を整形する")
mantissa_10bit = mantissa_bits[:10].ljust(10, '0')
st.write(f"元の仮数: {mantissa_bits}")
st.code(mantissa_10bit, language="text")
st.success(f"仮数部 (M): {mantissa_10bit}")
st.write("仮数の部分を抜き出し、足りない桁を0で埋めます。")

st.subheader("🎉 完成した浮動小数点数")
col1, col2, col3 = st.columns(3)
with col1:
    st.container()
    st.write("**符号部 (S)**")
    st.write("1ビット")
    st.success(f"{sign_bit}")

with col2:
    st.container()
    st.write("**指数部 (E)**")
    st.write("5ビット")
    st.success(f"{exponent_binary}")

with col3:
    st.container()
    st.write("**仮数部 (M)**")
    st.write("10ビット")
    st.success(f"{mantissa_10bit}")

final_result = f"{sign_bit} {exponent_binary} {mantissa_10bit}"
st.code(final_result, language="text")

st.markdown("---")

# パート2: 浮動小数点数 → 10進数
st.header("パート2：浮動小数点数を10進数に戻してみよう 🔬")
st.write("今度は逆の変換を体験してみましょう！浮動小数点数から10進数へ変換します。")

# 入力
col1, col2, col3 = st.columns(3)
with col1:
    input_s = st.text_input("符号部 (S) - 1ビット", value="0", max_chars=1)
with col2:
    input_e = st.text_input("指数部 (E) - 5ビット", value="01110", max_chars=5)
with col3:
    input_m = st.text_input("仮数部 (M) - 10ビット", value="1100000000", max_chars=10)

st.subheader("ステップ1: 各パーツを読み解く")
st.write(f"符号部 (S): {input_s}")
st.write(f"指数部 (E): {input_e}")
st.write(f"仮数部 (M): {input_m}")

st.subheader("ステップ2: 符号 (S) を確認する")
if input_s == "0":
    st.info("符号は「正」です。")
    final_sign = 1
else:
    st.info("符号は「負」です。")
    final_sign = -1

st.subheader("ステップ3: 指数 (E) を元に戻す")
try:
    exponent_decimal = int(input_e, 2)
    actual_exponent = exponent_decimal - bias
    st.write(f"指数部 (E): {input_e} (2進数) → {exponent_decimal} (10進数)")
    st.write(f"計算式: {exponent_decimal} - {bias} (バイアス) = {actual_exponent}")
    st.success(f"実際の指数: {actual_exponent}")
except ValueError:
    st.error("指数部は2進数で入力してください（0と1のみ）")
    actual_exponent = 0

st.subheader("ステップ4: 仮数 (M) を元に戻す")
restored_mantissa = f"1.{input_m}"
st.write(f"仮数部 (M): {input_m}")
st.write(f"復元後: {restored_mantissa}")
st.write("省略されていた先頭の「1.」を付け加えました。")

st.subheader("ステップ5: すべてを結合して計算する")
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
st.success(f"{decimal_result}")

st.markdown("---")
st.write("**学習のポイント:**")
st.write("- 浮動小数点数は「符号」「指数」「仮数」の3つの部分から構成されています")
st.write("- コンピュータは2進数で計算するため、10進数の小数を完全に表現できない場合があります")
st.write("- バイアス値を使うことで、負の指数も効率的に表現できます")