#!/usr/bin/python

import rospy
from sensor_msgs.msg import JointState
import math
import sys

class FingersGripperStatePublisher:
    def __init__(self, prefix):
        self.joint_state_sub = rospy.Subscriber('joint_states', JointState, self.joint_state_callback)
        self.joint_state_pub = rospy.Publisher('joint_states', JointState, queue_size=10)
        
        self.joint_state_pub_msg = JointState()
        self.joint_state_pub_msg.name = [prefix+'_gripper_inside_joint', prefix+'_gripper_outside_joint']
        self.joint_state_pub_msg.position = [0.0, 0.0]

        self.piston_length = 0.0  # m

        # Constants
        self.piston_length_offset = 0.009  # m
        self.piston_to_gripper_link_dist = 0.025  # m
        self.pivot_point_to_gripper_link_dist = 0.03636756796927724  # m
        self.pivot_point_to_piston_horizontal = 0.033  # m
        self.offset_angle = -0.820403314  # rad

        # Wait for message to initialize
        self.joint_state_callback(
            rospy.wait_for_message('joint_states', JointState))
        return

    def joint_state_callback(self, message):
        idx = 0
        try:
            idx = message.name.index("girona1000_bravo7_push_rod_link")
        except:
            return
        
        self.piston_length = message.position[idx]
        return

    def computeAngleAndPublish(self):
        c = self.piston_length + self.piston_length_offset
        a = self.pivot_point_to_gripper_link_dist
        b = self.piston_to_gripper_link_dist

        # The angle is found from the following equations
        #    a * sin(alpha) = b * sin(beta) + c
        #    alpha + beta = 90
        #  which can be solved into alpha = 2*atan((a - sqrt(a^2 + b^2 - c^2))/(b-c))

        # Let this awesome sketch be one of the fingers:
        #  /\  where A is angle alpha and B is the angle beta
        # / |        o=====o is b
        # |  \       the / line adjacent to A is a
        #  \  \      the piston length is c
        #   \  \
        #    \   o=====o||
        #     \ /     B|--|
        #     |/A      |--|
        #     o--------|--|

        self.final_angle = (-2.0 * math.atan2((a - math.sqrt(math.pow(a, 2) +
                            math.pow(b, 2) - math.pow(c, 2))), (b - c))) + self.offset_angle

        self.joint_state_pub_msg.position[0] = self.final_angle
        self.joint_state_pub_msg.position[1] = -self.final_angle

        self.joint_state_pub_msg.header.stamp = rospy.Time.now()
        self.joint_state_pub.publish(self.joint_state_pub_msg)

        return


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: node prefix")
        exit(-1)
    prefix = sys.argv[1]
    rospy.init_node("fingers_gripper_state_publisher")
    gripper_state_publisher = FingersGripperStatePublisher(prefix)
    rate = rospy.Rate(50)
    while not rospy.is_shutdown():
        rate.sleep()
        gripper_state_publisher.computeAngleAndPublish()
