import { useState, useEffect } from 'react'
import {
  Button,
  Card,
  Form,
  DatePicker,
  message,
  Space,
  Select,
  ConfigProvider,
  Typography,
  Progress as ProgressBar,
  Table
} from 'antd'
import { LotteryTarget, Progress } from '../../../common/types'
import dayjs, { Dayjs } from 'dayjs'
dayjs.locale('ja')
import locale from 'antd/locale/ja_JP'
import 'dayjs/locale/ja'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Profile, Member } from '../../../common/types'
import { COURTS } from '../../../common/constants'

interface LotteryApplicationValues {
  lotteryTargets: {
    date: Dayjs
    startHour: number
    court: string
  }[]
}

interface BulkLotteryApplicationPageProps {
  profile: Profile | null
}

const BulkLotteryApplicationPage = ({
  profile
}: BulkLotteryApplicationPageProps): React.JSX.Element => {
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [errorStats, setErrorStats] = useState<
    Array<{
      type: string
      target: LotteryTarget
      member: Member
    }>
  >([])
  const [courtStats, setCourtStats] = useState<
    Array<{
      target: { court: string; date: Dayjs; startHour: number }
      succeed: number
    }>
  >([])

  useEffect(() => {
    return window.api.onSubmitLotteryProgress((progress) => {
      setProgress(progress)
    })
  }, [])

  const handleRetry = async (errorRecord: {
    type: string
    target: LotteryTarget
    member: Member
  }): Promise<void> => {
    if (!profile) {
      messageApi.error('プロフィール情報がありません。再ログインしてください')
      return
    }
    try {
      const serializedTarget = {
        ...errorRecord.target,
        court: errorRecord.target.court,
        date: errorRecord.target.date.format('YYYY-MM-DD')
      }
      const result = await window.api.submitLotteryApplication(
        profile.id,
        [serializedTarget],
        false
      )

      if (result[0].status === 'success') {
        messageApi.success('抽選の再実行に成功しました')
        // 成功したら該当レコードのtypeを更新
        setErrorStats(
          errorStats.map((stat) =>
            stat.member.id === errorRecord.member.id &&
            stat.target.court.name === errorRecord.target.court.name &&
            stat.target.startHour === errorRecord.target.startHour
              ? { ...stat, type: '成功' }
              : stat
          )
        )
      } else {
        messageApi.error('抽選の再実行に失敗しました')
      }
    } catch (err) {
      console.error('抽選再実行エラー:', err)
      messageApi.error(err instanceof Error ? err.message : '抽選の再実行に失敗しました')
    }
  }

  const handleSubmit = async (values: LotteryApplicationValues): Promise<void> => {
    if (!profile) {
      console.error('バグ: プロフィール情報がnullです。認証フローの確認が必要です。')
      messageApi.error('システムエラーが発生しました。管理者に連絡してください')
      return
    }
    setLoading(true)
    try {
      const serializedTargets = values.lotteryTargets.map((target) => ({
        ...target,
        court: COURTS.filter((court) => court.name === target.court)[0],
        date: target.date.format('YYYY-MM-DD')
      }))
      const lotteryResults = await window.api.submitLotteryApplication(
        profile.id,
        serializedTargets
      )

      // エラー統計
      const loginFailed = lotteryResults
        .filter((r) => r.status === 'login-failed')
        .map((result) => ({
          type: 'ログイン失敗',
          target: { ...result.lotteryTarget, date: dayjs(result.lotteryTarget.date) },
          member: result.member
        }))
      const errors = lotteryResults
        .filter((r) => r.status === 'error')
        .map((result) => ({
          type: 'エラー',
          target: { ...result.lotteryTarget, date: dayjs(result.lotteryTarget.date) },
          member: result.member
        }))
      setErrorStats([...loginFailed, ...errors])

      // コート・時間ごとの成功数集計
      const stats = values.lotteryTargets.map((target) => ({
        target,
        succeed: lotteryResults.filter(
          (result) =>
            result.status === 'success' &&
            result.lotteryTarget.date === target.date.format('YYYY-MM-DD') &&
            result.lotteryTarget.startHour === target.startHour &&
            result.lotteryTarget.court.name === target.court
        ).length
      }))

      setHasCompleted(true)
      setCourtStats(stats)
      messageApi.success('一括抽選申込みが完了しました')
    } catch (err) {
      console.error('一括抽選申込みエラー:', err)
      messageApi.error(err instanceof Error ? err.message : '一括抽選申込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  let percent = progress ? Math.floor((progress.current / progress.total) * 100) : 0
  if (loading) {
    percent = Math.min(99, percent)
  }

  return (
    <ConfigProvider locale={locale}>
      {contextHolder}
      <div>
        <Typography.Title level={2} style={{ marginBottom: '20px' }}>
          一括抽選申込み
        </Typography.Title>
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
              <Button type="primary" htmlType="submit" loading={loading} disabled={loading}>
                一括申し込む
              </Button>
              <Button htmlType="reset">リセット</Button>
            </Space>
          </Form.Item>
          {progress && (
            <Space direction="vertical" style={{ marginTop: 16, width: '100%' }}>
              <ProgressBar percent={percent} />
              <Typography.Text>
                {progress.message} ({progress.current}/{progress.total})
              </Typography.Text>
            </Space>
          )}
          {hasCompleted && (
            <>
              <Card style={{ marginTop: 16 }} title="申込み完了">
                <Typography.Text>一括抽選申込みが正常に完了しました</Typography.Text>
              </Card>
              <Card style={{ marginTop: 16 }} title="抽選結果統計">
                <Typography.Text strong>全体統計:</Typography.Text>

                <Table
                  title={() => 'エラー統計'}
                  bordered
                  dataSource={errorStats}
                  columns={[
                    {
                      title: '結果',
                      dataIndex: 'type',
                      key: 'type'
                    },
                    {
                      title: 'メンバー',
                      dataIndex: ['member', 'name'],
                      key: 'member'
                    },
                    {
                      title: '抽選対象',
                      dataIndex: ['target'],
                      key: 'target',
                      render: (target) => `${target.court.name} ${target.startHour}:00 ~`
                    },
                    {
                      title: 'アクション',
                      key: 'action',
                      render: (_, record) => (
                        <Button type="link" onClick={() => handleRetry(record)}>
                          再実行
                        </Button>
                      )
                    }
                  ]}
                  style={{ marginTop: 16 }}
                  pagination={false}
                />

                {courtStats.length > 0 && (
                  <Table
                    title={() => 'コート別成功数'}
                    bordered
                    dataSource={courtStats.map((stat) => ({
                      key: `${stat.target.court}-${stat.target.date.format('YYYY-MM-DD')}-${stat.target.startHour}`,
                      court: stat.target.court,
                      date: stat.target.date.format('M/D(ddd)'),
                      time: `${stat.target.startHour}:00~`,
                      succeed: `${stat.succeed}件`
                    }))}
                    columns={[
                      {
                        title: 'コート',
                        dataIndex: 'court',
                        key: 'court'
                      },
                      {
                        title: '日付',
                        dataIndex: 'date',
                        key: 'date'
                      },
                      {
                        title: '時間',
                        dataIndex: 'time',
                        key: 'time'
                      },
                      {
                        title: '成功数',
                        dataIndex: 'succeed',
                        key: 'succeed'
                      }
                    ]}
                    style={{ marginTop: 16 }}
                    pagination={false}
                  />
                )}
              </Card>
            </>
          )}
        </Form>
      </div>
    </ConfigProvider>
  )
}

export default BulkLotteryApplicationPage
