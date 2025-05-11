import 'antd/dist/reset.css'
import { Layout, Menu } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import MembersPage from './components/MembersPage'

const { Sider, Content } = Layout

function App(): React.JSX.Element {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div
          className="logo"
          style={{
            height: '32px',
            margin: '16px',
            background: 'rgba(255, 255, 255, 0.2)'
          }}
        />
        <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']}>
          <Menu.Item key="1" icon={<UserOutlined />}>
            カード一覧
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Content style={{ margin: '16px' }}>
          <MembersPage />
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
