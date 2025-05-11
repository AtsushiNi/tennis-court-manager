import { Table, Button, Space, message, Tag } from 'antd'
import { useEffect, useState } from 'react'
import type { ColumnsType } from 'antd/es/table'
import { Profile } from '../../../common/types'

interface ApplicationStatus {
  key: string
  date: string
  timeSlot: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  courtNumber?: number
}

interface StatusCheckPageProps {
  profile: Profile | null
}

const StatusCheckPage = ({ profile }: StatusCheckPageProps): React.JSX.Element => {
  const [applications, setApplications] = useState<ApplicationStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    if (!profile) return

    const loadApplications = async (): Promise<void> => {
      setLoading(true)
      try {
        const data = await window.api.getApplicationStatus(profile.id)
        setApplications(data)
      } catch (err) {
        console.error('申込み状況取得エラー:', err)
        messageApi.error('申込み状況の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    loadApplications()
  }, [profile])

  const handleCancel = async (key: string): Promise<void> => {
    try {
      const success = await window.api.cancelApplication(profile?.id || '', key)
      if (success) {
        messageApi.success('申込みをキャンセルしました')
        setApplications(applications.filter(app => app.key !== key))
      } else {
        throw new Error('キャンセルに失敗しました')
      }
    } catch (err) {
      console.error('キャンセルエラー:', err)
      messageApi.error(err instanceof Error ? err.message : 'キャンセルに失敗しました')
    }
  }

  const columns: ColumnsType<ApplicationStatus> = [
    {
      title: '日付',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: '時間帯',
      dataIndex: 'timeSlot',
      key: 'timeSlot'
    },
    {
      title: '状態',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          pending: { color: 'orange', text: '審査中' },
          approved: { color: 'green', text: '当選' },
          rejected: { color: 'red', text: '落選' },
          cancelled: { color: 'gray', text: 'キャンセル' }
        }
        return <Tag color={statusMap[status].color}>{statusMap[status].text}</Tag>
      }
    },
    {
      title: 'コート番号',
      dataIndex: 'courtNumber',
      key: 'courtNumber',
      render: (courtNumber) => courtNumber || '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button danger onClick={() => handleCancel(record.key)}>
              キャンセル
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <>
      {contextHolder}
      <div>
        <h1 style={{ marginBottom: '20px' }}>申込み状況確認</h1>
        <Table
          columns={columns}
          dataSource={applications}
          loading={loading}
          rowKey="key"
          locale={{ emptyText: '申込み履歴がありません' }}
        />
      </div>
    </>
  )
}

export default StatusCheckPage
