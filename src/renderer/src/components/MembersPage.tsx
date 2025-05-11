import { Table, Button, Space, message, Modal, Form, Input } from 'antd'
import { useState, useEffect } from 'react'
import type { ColumnsType } from 'antd/es/table'
import * as XLSX from 'xlsx'
import { Member, Profile } from '../../../types'

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

  // Excelエクスポート
  const exportToExcel = (): void => {
    const renamedMembers = members.map((member) => ({
      氏名: member.name,
      登録番号: member.id,
      パスワード: member.password
    }))
    const ws = XLSX.utils.json_to_sheet(renamedMembers)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'カード一覧')

    const now = new Date()
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
    XLSX.writeFile(wb, `cards_${timestamp}.xlsx`)
    messageApi.success('Excelファイルをエクスポートしました')
  }

  // Excelインポート
  const importFromExcel = (file: File): void => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet)
      const formattedData = jsonData.map((item, index) => ({
        name: item['氏名'],
        id: item['登録番号'],
        password: item['パスワード'],
        key: String(index + 1),
        ...item
      }))
      console.log(formattedData)
      setMembers(formattedData)
      messageApi.success(`${jsonData.length}件のデータをインポートしました`)
    }
    reader.readAsArrayBuffer(file)
  }

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
            <Button type="default" onClick={exportToExcel}>
              Excelエクスポート
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  importFromExcel(e.target.files[0])
                }
              }}
              style={{ display: 'none' }}
              id="excel-upload"
            />
            <Button type="default" onClick={() => document.getElementById('excel-upload')?.click()}>
              Excelインポート
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
