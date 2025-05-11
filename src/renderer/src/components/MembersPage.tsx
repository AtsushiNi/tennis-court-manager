import { Table, Button, Space, message } from 'antd'
import { useState } from 'react'
import type { ColumnsType } from 'antd/es/table'
import * as XLSX from 'xlsx'

interface Member {
  key: string
  name: string
  id: string
  password: string
}

const MembersPage = (): React.JSX.Element => {
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
    }
  ]

  const [members, setMembers] = useState<Member[]>([])

  // Excelエクスポート
  const exportToExcel = (): void => {
    const renamedMembers = members.map(member => ({
      '氏名': member.name,
      '登録番号': member.id,
      'パスワード': member.password
    }))
    const ws = XLSX.utils.json_to_sheet(renamedMembers)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'カード一覧')

    const now = new Date()
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
    XLSX.writeFile(wb, `cards_${timestamp}.xlsx`)
    message.success('Excelファイルをエクスポートしました')
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
      message.success(`${jsonData.length}件のデータをインポートしました`)
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>カード一覧</h1>
      <Space style={{ marginBottom: '16px' }}>
        <Button type="primary" onClick={exportToExcel}>
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
        <Button onClick={() => document.getElementById('excel-upload')?.click()}>
          Excelインポート
        </Button>
      </Space>
      <Table columns={columns} dataSource={members} />
    </div>
  )
}

export default MembersPage
