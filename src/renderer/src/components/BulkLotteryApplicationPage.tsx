import { Button, Form, DatePicker, message, Space, Select, ConfigProvider, Typography } from 'antd'
import dayjs from 'dayjs'
import locale from 'antd/locale/ja_JP'
import 'dayjs/locale/ja'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'

dayjs.locale('ja')
import { LotteryTarget, Profile } from '../../../common/types'
import { COURTS } from '../../../common/constants'

interface LotteryApplicationValues {
  lotteryTargets: LotteryTarget[]
}

interface BulkLotteryApplicationPageProps {
  profile: Profile | null
}

const BulkLotteryApplicationPage = ({
  profile
}: BulkLotteryApplicationPageProps): React.JSX.Element => {
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const handleSubmit = async (values: LotteryApplicationValues): Promise<void> => {
    if (!profile) {
      console.error('バグ: プロフィール情報がnullです。認証フローの確認が必要です。')
      messageApi.error('システムエラーが発生しました。管理者に連絡してください')
      return
    }
    try {
      await window.api.submitLotteryApplication(profile.id, values.lotteryTargets)
    } catch (err) {
      console.error('一括抽選申込みエラー:', err)
      messageApi.error(err instanceof Error ? err.message : '一括抽選申込みに失敗しました')
    }
  }

  return (
    <ConfigProvider locale={locale}>
      {contextHolder}
      <div>
        <Typography.Title level={2} style={{ marginBottom: '20px' }}>一括抽選申込み</Typography.Title>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.List name="lotteryTargets">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'court']}
                      label="コート"
                      rules={[{ required: true, message: 'コートを選択してください' }]}
                    >
                      <Select
                        placeholder="コートを選択"
                        options={COURTS.map((court) => ({
                          label: court.name,
                          value: court.name
                        }))}
                        showSearch
                        optionFilterProp="label"
                        dropdownStyle={{ minWidth: '260px' }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'date']}
                      label="日付"
                      rules={[{ required: true, message: '日付を選択してください' }]}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        format="M/D(ddd)"
                        defaultValue={dayjs().add(1, 'month').startOf('month')}
                        disabledDate={(current) => {
                          const today = dayjs()
                          const nextMonth = today.add(1, 'month')
                          return (
                            current < nextMonth.startOf('month') ||
                            current > nextMonth.endOf('month')
                          )
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'startHour']}
                      label="時間帯"
                      rules={[{ required: true, message: '時間帯を選択してください' }]}
                    >
                      <Select
                        placeholder="時間帯を選択"
                        options={[
                          { label: '9:00~', value: 9 },
                          { label: '11:00~', value: 11 },
                          { label: '13:00~', value: 13 },
                          { label: '15:00~', value: 15 },
                          { label: '17:00~', value: 17 },
                          { label: '19:00~', value: 19 }
                        ]}
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ marginLeft: 8 }} />
                  </Space>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                    style={{ marginTop: 8 }}
                  >
                    コート・日時を追加
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                一括申し込む
              </Button>
              <Button htmlType="reset">リセット</Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </ConfigProvider>
  )
}

export default BulkLotteryApplicationPage
