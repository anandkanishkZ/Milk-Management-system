import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // Start animations sequence
    const animations = Animated.sequence([
      // Fade in background
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Scale up logo
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      // Slide in text
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      // Start milk drop animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]);

    // Rotation animation for milk drops
    const rotationAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    animations.start();
    rotationAnimation.start();

    return () => {
      animations.stop();
      rotationAnimation.stop();
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bounceTranslate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <LinearGradient
      colors={['#E3F2FD', '#BBDEFB', '#90CAF9']}
      style={styles.container}
    >
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Cow/Milk Logo */}
        <View style={styles.logoContainer}>

          {/* Cow Silhouette */}
          <View style={styles.cowContainer}>
            <View style={styles.cowBody}>
              <View style={styles.cowSpot1} />
              <View style={styles.cowSpot2} />
              <View style={styles.cowSpot3} />
            </View>
            <View style={styles.cowHead}>
              <View style={styles.cowEar1} />
              <View style={styles.cowEar2} />
              <View style={styles.cowEye1} />
              <View style={styles.cowEye2} />
            </View>
            <View style={styles.cowLegs}>
              <View style={styles.leg1} />
              <View style={styles.leg2} />
              <View style={styles.leg3} />
              <View style={styles.leg4} />
            </View>
          </View>
        </View>

        {/* App Title */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>🥛 Dudh Wala</Text>
          <Text style={styles.subtitle}>Fresh Milk Delivery</Text>
          <Text style={styles.tagline}>Your Daily Dose of Freshness</Text>
        </Animated.View>

        {/* Loading Animation */}
        <Animated.View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            <Animated.View 
              style={[
                styles.dot,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            />
            <Animated.View 
              style={[
                styles.dot,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            />
            <Animated.View 
              style={[
                styles.dot,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            />
          </View>
        </Animated.View>
      </Animated.View>

      {/* Background Decorations */}
      <View style={styles.backgroundDecorations}>
        <Animated.View 
          style={[
            styles.bgBubble1,
            {
              transform: [{ rotate }],
            },
          ]}
        />
        <Animated.View 
          style={[
            styles.bgBubble2,
            {
              transform: [{ rotate }],
            },
          ]}
        />
        <Animated.View 
          style={[
            styles.bgBubble3,
            {
              transform: [{ rotate }],
            },
          ]}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },

  cowContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  cowBody: {
    width: 80,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    position: 'relative',
  },
  cowSpot1: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 15,
    height: 12,
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  cowSpot2: {
    position: 'absolute',
    top: 20,
    right: 15,
    width: 12,
    height: 10,
    backgroundColor: '#333333',
    borderRadius: 6,
  },
  cowSpot3: {
    position: 'absolute',
    bottom: 10,
    left: 25,
    width: 18,
    height: 14,
    backgroundColor: '#333333',
    borderRadius: 9,
  },
  cowHead: {
    width: 40,
    height: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginTop: -10,
    position: 'relative',
  },
  cowEar1: {
    position: 'absolute',
    top: -5,
    left: 5,
    width: 8,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    transform: [{ rotate: '-20deg' }],
  },
  cowEar2: {
    position: 'absolute',
    top: -5,
    right: 5,
    width: 8,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    transform: [{ rotate: '20deg' }],
  },
  cowEye1: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 4,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
  },
  cowEye2: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 4,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
  },
  cowLegs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 70,
    marginTop: -8,
  },
  leg1: {
    width: 8,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  leg2: {
    width: 8,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  leg3: {
    width: 8,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  leg4: {
    width: 8,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1565C0',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 18,
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '600',
  },
  tagline: {
    fontSize: 14,
    color: '#42A5F5',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    marginTop: 30,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
    marginHorizontal: 4,
  },
  backgroundDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  bgBubble1: {
    position: 'absolute',
    top: 100,
    left: 50,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  bgBubble2: {
    position: 'absolute',
    top: 200,
    right: 40,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  bgBubble3: {
    position: 'absolute',
    bottom: 150,
    left: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});