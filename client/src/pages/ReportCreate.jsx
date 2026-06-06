import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { claimApi } from '../services/api';

const { Title } = Typography;
const { TextArea } = Input;

function ReportCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const data = {
        ...values,
        accident_time: values.accident_time.format('YYYY-MM-DD HH:mm:ss')
      };
      await claimApi.createReport(data);
      message.success('报案登记成功');
      navigate('/');
    } catch (error) {
      message.error('报案登记失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <Title level={3}>报案登记</Title>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            accident_time: dayjs()
          }}
        >
          <Title level={5} style={{ marginBottom: 16 }}>报案人信息</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Form.Item
              name="reporter_name"
              label="报案人姓名"
              rules={[{ required: true, message: '请输入报案人姓名' }]}
            >
              <Input placeholder="请输入报案人姓名" />
            </Form.Item>
            <Form.Item
              name="reporter_phone"
              label="联系电话"
              rules={[
                { required: true, message: '请输入联系电话' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
              ]}
            >
              <Input placeholder="请输入联系电话" />
            </Form.Item>
          </div>

          <Title level={5} style={{ margin: '24px 0 16px' }}>事故信息</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Form.Item
              name="accident_time"
              label="事故时间"
              rules={[{ required: true, message: '请选择事故时间' }]}
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="accident_location"
              label="事故地点"
              rules={[{ required: true, message: '请输入事故地点' }]}
            >
              <Input placeholder="请输入事故地点" />
            </Form.Item>
          </div>
          <Form.Item
            name="accident_description"
            label="事故描述"
            rules={[{ required: true, message: '请输入事故描述' }]}
          >
            <TextArea rows={4} placeholder="请详细描述事故经过" />
          </Form.Item>

          <Title level={5} style={{ margin: '24px 0 16px' }}>车辆信息</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
            <Form.Item
              name="vehicle_plate"
              label="车牌号"
              rules={[{ required: true, message: '请输入车牌号' }]}
            >
              <Input placeholder="例如：京A12345" />
            </Form.Item>
            <Form.Item
              name="vehicle_brand"
              label="车辆品牌"
              rules={[{ required: true, message: '请输入车辆品牌' }]}
            >
              <Input placeholder="例如：大众" />
            </Form.Item>
            <Form.Item
              name="vehicle_model"
              label="车辆型号"
              rules={[{ required: true, message: '请输入车辆型号' }]}
            >
              <Input placeholder="例如：迈腾2023款" />
            </Form.Item>
          </div>

          <Form.Item style={{ marginTop: 32 }}>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              提交报案
            </Button>
            <Button 
              style={{ marginLeft: 12 }} 
              size="large"
              onClick={() => navigate('/')}
            >
              取消
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default ReportCreate;
