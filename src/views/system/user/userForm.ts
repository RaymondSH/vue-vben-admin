import { BasicColumn } from '/@/components/Table';
import { FormSchema } from '/@/components/Table';
export const columns: BasicColumn[] = [
  {
    title: '用户账号',
    dataIndex: 'username',
    width: 120,
  },
  {
    title: '用户姓名',
    dataIndex: 'realname',
    width: 100,
  },

  {
    title: '性别',
    dataIndex: 'sex',
    width: 80,
    sorter: true,
  },
  {
    title: '生日',
    dataIndex: 'birthday',
    width: 100,
  },
  {
    title: '手机号',
    dataIndex: 'phone',
    width: 100,
  },
  {
    title: '部门',
    width: 150,
    dataIndex: 'orgCodeTxt',
  },
  {
    title: '负责部门',
    width: 150,
    dataIndex: 'departIds_dictText',
  },
  {
    title: '状态',
    dataIndex: 'status_dictText',
    width: 80,
  },
];

export const recycleColumns: BasicColumn[] = [
  {
    title: '用户账号',
    dataIndex: 'username',
    width: 100,
  },
  {
    title: '用户姓名',
    dataIndex: 'realname',
    width: 100,
  },
  {
    title: '头像',
    dataIndex: 'avatar',
    width: 80,
  },
  {
    title: '性别',
    dataIndex: 'sex',
    width: 80,
    sorter: true,
  },
];

export const searchFormSchema: FormSchema[] = [
  {
    label: '真实名称',
    field: 'realname',
    component: 'Input',
    colProps: { span: 6 },
  },
  {
    label: '手机号码',
    field: 'phone',
    component: 'Input',
    colProps: { span: 6 },
  },
];

export const formSchema: FormSchema[] = [
  {
    label: '',
    field: 'id',
    component: 'Input',
    show: false,
  },
  {
    label: '用户账号',
    field: 'username',
    component: 'Input',
  },
  {
    label: '用户工号',
    field: 'workNo',
    component: 'Input',
  },
  {
    label: '登录密码',
    field: 'password',
    component: 'StrengthMeter',
    rules: [
      {
        required: true,
        message: '请输入登录密码',
      },
    ],
  },
  {
    label: '确认密码',
    field: 'confirmPassword',
    component: 'InputPassword',
  },
  {
    label: '负责部门',
    field: 'departIds',
    component: 'Select',
    componentProps: {
      mode: 'multiple',
    },
    ifShow: ({ values }) => values.userIdentity == 2,
  },
  {
    label: '生日',
    field: 'birthday',
    component: 'DatePicker',
  },
  {
    label: '座机',
    field: 'telephone',
    component: 'Input',
    rules: [{ pattern: /^0\d{2,3}-[1-9]\d{6,7}$/, message: '请输入正确的座机号码' }],
  },
];
