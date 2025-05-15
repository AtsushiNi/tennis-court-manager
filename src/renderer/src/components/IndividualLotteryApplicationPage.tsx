import { Button, Form, Input, DatePicker, message, Space } from 'antd'
import type { Dayjs } from 'dayjs'
import { Profile } from '../../../common/types'

interface LotteryApplicationValues {
  name: string
  memberId: string
  date: Dayjs
  timeSlot: string
}

interface IndividualLotteryApplicationPageProps {
  profile: Profile | null
}

const IndividualLotteryApplicationPage = ({
  profile
}: IndividualLotteryApplicationPageProps): React.JSX.Element => {
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const handleSubmit = async (values: LotteryApplicationValues): Promise<void> => {
    if (!profile) {
      messageApi.error('ログインが必要です')
      return
    }

    try {
      // 時間帯から開始時間を抽出（例: "13:00-15:00" → 13）
      const startHour = parseInt(values.timeSlot.split(':')[0])

      const applicationData = {
        memberId: values.memberId,
        name: values.name,
        date: values.date,
        startHour,
        court: {
          name: 'コート1',
          type: 'テニス（人工芝）' as const
        }
      }

      const result = await window.api.submitLotteryApplication(profile.id, [applicationData])

      if (result.success) {
        messageApi.success('個別抽選申込みが完了しました')
        form.resetFields()
      } else {
        throw new Error(result.message || '個別抽選申込みに失敗しました')
      }
    } catch (err) {
      console.error('個別抽選申込みエラー:', err)
      messageApi.error(err instanceof Error ? err.message : '個別抽選申込みに失敗しました')
    }
  }

  return (
    <>
      {contextHolder}
      <div>
        <h1 style={{ marginBottom: '20px' }}>個別抽選申込み</h1>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="氏名"
            initialValue={profile?.name}
            rules={[{ required: true, message: '氏名を入力してください' }]}
          >
            <Input disabled={!!profile} />
          </Form.Item>

          <Form.Item
            name="memberId"
            label="登録番号"
            initialValue={profile?.id}
            rules={[{ required: true, message: '登録番号を入力してください' }]}
          >
            <Input disabled={!!profile} />
          </Form.Item>

          <Form.Item
            name="date"
            label="希望日"
            rules={[{ required: true, message: '希望日を選択してください' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="timeSlot"
            label="希望時間帯"
            rules={[{ required: true, message: '希望時間帯を入力してください' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                申し込む
              </Button>
              <Button htmlType="reset">リセット</Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </>
  )
}

export default IndividualLotteryApplicationPage
