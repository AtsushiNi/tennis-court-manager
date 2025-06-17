import { useState, useEffect, useRef, useCallback } from 'react'
import dayjs from 'dayjs' // Used for time formatting in handleSaveSettings
import customParseFormat from 'dayjs/plugin/customParseFormat'
dayjs.extend(customParseFormat)
import {
  Card,
  message,
  Typography,
  Form,
  Row,
  Col,
  Button,
  Spin,
  Select,
  Checkbox,
  TimePicker,
  InputNumber
} from 'antd'
import { Profile, Member, ReservationSetting } from 'src/common/types'
import { COURTS } from '../../../common/constants'

interface ReservationPageProps {
  profile: Profile | null
}

const ReservationPage = ({ profile }: ReservationPageProps): React.JSX.Element => {
  const [messageApi, contextHolder] = message.useMessage()
  const [isAutoReserving, setIsAutoReserving] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    if (!profile) return

    const loadMembers = async (): Promise<void> => {
      try {
        const loadedMembers = await window.api.loadMembers(profile.id)
        setMembers(loadedMembers)
      } catch (err) {
        console.error('Failed to load members:', err)
        messageApi.error('メンバーデータの読み込みに失敗しました')
      }
    }

    const loadSettings = async (): Promise<void> => {
      try {
        const settings = await window.api.loadReservationSetting(profile.id)
        if (settings) {
          form.setFieldsValue({
            user: settings.member.id,
            days: settings.days,
            daysOfWeek: settings.daysOfWeek,
            courts: settings.courts.map((c) => c.name),
            interval: settings.interval,
            weekdayTimes: settings.weekdayTimes?.length
              ? [dayjs(settings.weekdayTimes[0], 'HH:mm'), dayjs(settings.weekdayTimes[1], 'HH:mm')]
              : null,
            saturdayTimes: settings.saturdayTimes?.length
              ? [
                  dayjs(settings.saturdayTimes[0], 'HH:mm'),
                  dayjs(settings.saturdayTimes[1], 'HH:mm')
                ]
              : null,
            sundayTimes: settings.sundayTimes?.length
              ? [dayjs(settings.sundayTimes[0], 'HH:mm'), dayjs(settings.sundayTimes[1], 'HH:mm')]
              : null,
            holidayTimes: settings.holidayTimes?.length
              ? [dayjs(settings.holidayTimes[0], 'HH:mm'), dayjs(settings.holidayTimes[1], 'HH:mm')]
              : null
          })
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
        messageApi.error('設定の読み込みに失敗しました')
      }
    }

    loadMembers()
    loadSettings()
  }, [profile])

  const handleSaveSettings = useCallback(async (): Promise<void> => {
    let values
    try {
      values = await form.validateFields({ validateOnly: true })
    } catch (err) {
      console.error(err)
      // 入力途中は未入力項目があってもエラー表示にしない
      return
    }

    try {
      const selectedMember = members.find((m) => m.id === values.user)
      if (!selectedMember) {
        throw new Error('選択されたユーザーが見つかりません')
      }
      const selectedCourts = COURTS.filter((court) => values.courts.includes(court.name))

      const reservationSetting: ReservationSetting = {
        member: selectedMember,
        days: values.days,
        daysOfWeek: values.daysOfWeek,
        courts: selectedCourts,
        interval: values.interval,
        weekdayTimes: values.weekdayTimes?.map((t) => t?.format('HH:mm')) || [],
        saturdayTimes: values.saturdayTimes?.map((t) => t?.format('HH:mm')) || [],
        sundayTimes: values.sundayTimes?.map((t) => t?.format('HH:mm')) || [],
        holidayTimes: values.holidayTimes?.map((t) => t?.format('HH:mm')) || []
      }

      await window.api.saveReservationSetting(profile?.id || '', reservationSetting)
    } catch (err) {
      console.error('Failed to save settings:', err)
      messageApi.error('設定の保存に失敗しました')
    }
  }, [form, messageApi, profile?.id, members])

  // デバウンス用タイマー
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  // フォーム値変更時の自動保存処理
  const handleAutoSave = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    debounceTimer.current = setTimeout(() => {
      handleSaveSettings()
    }, 1000) // 1秒間隔で保存
  }, [handleSaveSettings])

  return (
    <>
      {contextHolder}
      <div>
        <Typography.Title level={2} style={{ marginBottom: '20px' }}>
          空きコート自動予約
        </Typography.Title>
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={() => setIsAutoReserving(true)}
            onValuesChange={handleAutoSave}
            initialValues={{
              days: 4,
              interval: 1,
              daysOfWeek: [],
              weekdayTimes: null,
              saturdayTimes: null,
              sundayTimes: null,
              holidayTimes: null
            }}
          >
            <Spin spinning={isAutoReserving} size="large" tip="自動予約 実行中...">
              <Typography.Title level={4}>ユーザー</Typography.Title>
              <Form.Item
                label="予約で使用するユーザー"
                name="user"
                rules={[{ required: true, message: 'ユーザーを選択してください' }]}
              >
                <Select
                  placeholder="ユーザーを選択"
                  options={members.map((member) => ({ label: member.name, value: member.id }))}
                />
              </Form.Item>

              <Typography.Title level={4}>日付・曜日</Typography.Title>
              <Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="days">
                      <InputNumber
                        min={1}
                        placeholder="日数"
                        defaultValue={4}
                        suffix="日後"
                        style={{ marginRight: 5, marginTop: 20 }}
                      />
                      から月末までの空きコートを検索
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="次の曜日のみ予約する"
                      name="daysOfWeek"
                      rules={[
                        {
                          validator: (_, value) =>
                            value && value.length > 0
                              ? Promise.resolve()
                              : Promise.reject(new Error('曜日を1つ以上選択してください'))
                        }
                      ]}
                    >
                      <Checkbox.Group
                        options={['月', '火', '水', '木', '金', '土', '日', '祝日']}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form.Item>

              <Typography.Title level={4}>開始時刻</Typography.Title>
              <Form.Item>
                <Row gutter={16}>
                  {[
                    { label: '平日', field: 'weekdayTimes' },
                    { label: '土曜日', field: 'saturdayTimes' },
                    { label: '日曜日', field: 'sundayTimes' },
                    { label: '祝日', field: 'holidayTimes' }
                  ].map(({ label, field }) => (
                    <Col span={12} key={field}>
                      <Form.Item label={label} name={field}>
                        <TimePicker.RangePicker
                          format="HH:mm"
                          minuteStep={30}
                          hideDisabledOptions
                          disabledTime={() => ({
                            disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 7, 20, 21, 22, 23]
                          })}
                        />
                      </Form.Item>
                    </Col>
                  ))}
                </Row>
              </Form.Item>

              <Typography.Title level={4}>コート</Typography.Title>
              <Form.Item
                label="コート選択"
                name="courts"
                rules={[
                  {
                    validator: (_, value) =>
                      value && value.length > 0
                        ? Promise.resolve()
                        : Promise.reject(new Error('コートを1つ以上選択してください'))
                  }
                ]}
              >
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Please select"
                  options={COURTS.map((court) => ({
                    label: court.name,
                    value: court.name
                  }))}
                />
              </Form.Item>

              <Typography.Title level={4}>自動実行 間隔</Typography.Title>
              <Form.Item name="interval">
                <InputNumber min={1} defaultValue={1} suffix="時間" style={{ marginRight: 5 }} />
                ごとに空きコートを検索・自動予約
              </Form.Item>
            </Spin>
            <Form.Item style={{ marginTop: '24px' }}>
              <Row gutter={16} justify="center">
                <Col>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    loading={isAutoReserving}
                    disabled={isAutoReserving}
                  >
                    自動予約実行
                  </Button>
                </Col>
                <Col>
                  <Button
                    danger
                    size="large"
                    onClick={() => setIsAutoReserving(false)}
                    disabled={!isAutoReserving}
                  >
                    停止
                  </Button>
                </Col>
              </Row>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </>
  )
}

export default ReservationPage
