/**
 * 字典值替换文本通用方法(多选)
 * @param dictOptions  字典数组
 * @param text  字典值
 * @return String
 */
export function filterMultiDictText(dictOptions, text) {
  //js “!text” 认为0为空，所以做提前处理
  if (text === 0 || text === '0') {
    if (dictOptions) {
      for (const dictItem of dictOptions) {
        if (text == dictItem.value) {
          return dictItem.text;
        }
      }
    }
  }

  if (!text || text == 'undefined' || text == 'null' || !dictOptions || dictOptions.length == 0) {
    return '';
  }
  let re = '';
  text = text.toString();
  const arr = text.split(',');
  dictOptions.forEach(function (option) {
    if (option) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === option.value) {
          re += option.text + ',';
          break;
        }
      }
    }
  });
  if (re == '') {
    return text;
  }
  return re.substring(0, re.length - 1);
}
