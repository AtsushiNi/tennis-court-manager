import { Table, Button, Space, message, Modal, Form, Input, Dropdown } from 'antd'
import { useState, useEffect } from 'react'
import type { ColumnsType } from 'antd/es/table'
import * as XLSX from 'xlsx'
import { Member, Profile } from '../../../common/types'

interface MembersPageProps {
  profile: Profile | null
}

const MembersPage = ({ profile }: MembersPageProps): React.JSX.Element => {
  const [members, setMembers] = useState<Member[]>([])
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  // プロファイル変更時にメンバーデータを読み込み
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
    loadMembers()
  }, [profile])

  // members変更時に自動保存
  useEffect(() => {
    if (!profile) return
    handleSave()
  }, [members])

  // メンバーデータ保存処理
  const handleSave = async (): Promise<void> => {
    if (!profile) {
      messageApi.warning('保存するメンバーデータがありません')
      return
    }

    try {
      const success = await window.api.saveMembers(profile.id, members)
      if (!success) {
        throw new Error('Save failed')
      }
    } catch (err) {
      console.error('Failed to save members:', err)
      messageApi.error('メンバーデータの保存に失敗しました')
    }
  }

  // メンバー削除処理
  const handleDelete = (key: string): void => {
    setMembers(members.filter((member) => member.key !== key))
    messageApi.success('メンバーを削除しました')
  }

  // メンバー編集開始
  const handleEdit = (member: Member): void => {
    setEditingMember(member)
    form.setFieldsValue(member)
    setIsModalOpen(true)
  }

  // メンバー追加/編集処理
  const handleOk = (): void => {
    form
      .validateFields()
      .then((values) => {
        // 登録番号の重複チェック
        const isDuplicate = members.some(
          // 編集時に登録番号をそのままにしても重複と判定させない
          (member) =>
            member.id === values.id && (!editingMember || member.key !== editingMember.key)
        )

        if (isDuplicate) {
          messageApi.error('この登録番号は既に使用されています')
          return
        }

        if (editingMember) {
          // 編集処理
          setMembers(
            members.map((member) =>
              member.key === editingMember.key ? { ...values, key: editingMember.key } : member
            )
          )
          messageApi.success('メンバーを更新しました')
        } else {
          // 追加処理
          const newMember = {
            ...values,
            key: Date.now().toString()
          }
          setMembers([...members, newMember])
          messageApi.success('メンバーを追加しました')
        }
        form.resetFields()
        setEditingMember(null)
        setIsModalOpen(false)
      })
      .catch((info) => {
        console.log('Validate Failed:', info)
      })
  }

  // エクスポート処理
  const handleExport = async (format: 'xlsx' | 'csv'): Promise<void> => {
    if (!profile) {
      messageApi.warning('プロファイルが選択されていません')
      return
    }

    try {
      const renamedMembers = members.map((member) => ({
        氏名: member.name,
        登録番号: member.id,
        パスワード: member.password
      }))

      const now = new Date()
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
      const fileName = `members_${profile.name}_${timestamp}.${format}`

      if (format === 'csv') {
        const csvContent = [
          Object.keys(renamedMembers[0]).join(','),
          ...renamedMembers.map(member => Object.values(member).join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        URL.revokeObjectURL(url)
      } else {
        const ws = XLSX.utils.json_to_sheet(renamedMembers)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'メンバー一覧')
        XLSX.writeFile(wb, fileName)
      }

      messageApi.success(`${format === 'csv' ? 'CSV' : 'Excel'}ファイルをエクスポートしました`)
    } catch (err) {
      console.error('Export failed:', err)
      messageApi.error('エクスポート処理中にエラーが発生しました')
    }
  }

  // インポート処理
  const importFromFile = async (file: File): Promise<void> => {
    if (!profile) {
      messageApi.warning('プロファイルが選択されていません')
      return
    }

    try {
      let jsonData: Array<Record<string, string>>
      
      if (file.name.endsWith('.csv')) {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsText(file)
        })
        const workbook = XLSX.read(text, { type: 'string' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet)
      } else {
        const data = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as ArrayBuffer)
          reader.onerror = reject
          reader.readAsArrayBuffer(file)
        })
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet)
      }

      const formattedData = jsonData.map((item, index) => ({
        name: item['氏名'],
        id: Number(item['登録番号']),
        password: item['パスワード'],
        key: String(index + 1),
        ...item
      }))
      setMembers(formattedData)
      messageApi.success(`${jsonData.length}件のデータをインポートしました`)
    } catch (err) {
      console.error('Import failed:', err)
      messageApi.error('ファイルのインポートに失敗しました')
    }
  }

  const exportMenuItems = [
    {
      key: 'xlsx',
      label: 'Excel形式でエクスポート',
      onClick: () => handleExport('xlsx')
    },
    {
      key: 'csv',
      label: 'CSV形式でエクスポート',
      onClick: () => handleExport('csv')
    }
  ]

  const columns: ColumnsType<Member> = [
    {
      title: '登録番号',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: '氏名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'パスワード',
      dataIndex: 'password',
      key: 'password'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button onClick={() => handleEdit(record)}>編集</Button>
          <Button danger onClick={() => handleDelete(record.key)}>
            削除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <>
      {contextHolder}
      <div>
        <h1 style={{ marginBottom: '20px' }}>カード一覧</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Button type="primary" onClick={() => setIsModalOpen(true)}>
            メンバー追加
          </Button>
          <Space>
            <Dropdown menu={{ items: exportMenuItems }}>
              <Button type="default">エクスポート</Button>
            </Dropdown>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  importFromFile(e.target.files[0])
                }
              }}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <Button type="default" onClick={() => document.getElementById('file-upload')?.click()}>
              インポート
            </Button>
          </Space>
        </div>
        <Modal
          title={editingMember ? 'メンバー編集' : 'メンバー追加'}
          open={isModalOpen}
          onOk={handleOk}
          onCancel={() => setIsModalOpen(false)}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="氏名"
              rules={[{ required: true, message: '氏名を入力してください' }]}
              extra="システムに登録している氏名と一致している必要はない。分かればOK"
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="id"
              label="登録番号"
              rules={[
                { required: true, message: '登録番号を入力してください' },
                { pattern: /^[0-9]+$/, message: '登録番号は数字のみ入力可能です' },
                { pattern: /^[^\s]*$/, message: 'スペースや改行は使用できません' }
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="password"
              label="パスワード"
              rules={[
                { required: true, message: 'パスワードを入力してください' },
                { pattern: /^[^\s]*$/, message: 'スペースや改行は使用できません' }
              ]}
            >
              <Input />
            </Form.Item>
          </Form>
        </Modal>
        <Table columns={columns} dataSource={members} />
      </div>
    </>
  )
}

export default MembersPage
