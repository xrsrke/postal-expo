import React, { useState, useEffect } from "react";
import {
	Animated,
	Image,
	SafeAreaView,
	View,
	StyleSheet,
	Alert,
} from "react-native";
import { connect } from "react-redux";

import {
	CodeField,
	Cursor,
	useBlurOnFulfill,
	useClearByFocusCell,
} from "react-native-confirmation-code-field";

import { TouchableOpacity } from "react-native-gesture-handler";
import Spinner from "react-native-loading-spinner-overlay";

import {
	Text,
	Icon,
	Layout,
	MenuItem,
	OverflowMenu,
	TopNavigation,
	TopNavigationAction,
	Divider,
} from "@ui-kitten/components";

import styles, {
	ACTIVE_CELL_BG_COLOR,
	CELL_BORDER_RADIUS,
	CELL_SIZE,
	DEFAULT_CELL_BG_COLOR,
	NOT_EMPTY_CELL_BG_COLOR,
} from "./styles";

import HTTPRequest from "../../../functions/httpRequest";
import SMS from "../../../functions/sms";
import { allNumeric } from "../../../functions/strings";
import {
	saveUserdata,
	directForNonAuth,
	setDataStorage,
	getDataFromStorage,
} from "../../../functions/helpers";

import { useQuery, useLazyQuery, useMutation } from "@apollo/client";
import {
	MUTATION_CREATE_CODE_CONFIRM,
	QUERY_CHECK_CODE_CONFIRM,
	MUTATION_ACTIVE_USER,
} from "../../../graphql/query";

const { Value, Text: AnimatedText } = Animated;

const CELL_COUNT = 4;
const source = {
	uri:
		"https://user-images.githubusercontent.com/4661784/56352614-4631a680-61d8-11e9-880d-86ecb053413d.png",
};

const BackIcon = (props) => <Icon {...props} name="arrow-back" />;

const animationsColor = [...new Array(CELL_COUNT)].map(() => new Value(0));
const animationsScale = [...new Array(CELL_COUNT)].map(() => new Value(1));
const animateCell = ({ hasValue, index, isFocused }) => {
	Animated.parallel([
		Animated.timing(animationsColor[index], {
			useNativeDriver: false,
			toValue: isFocused ? 1 : 0,
			duration: 250,
		}),
		Animated.spring(animationsScale[index], {
			useNativeDriver: false,
			toValue: hasValue ? 0 : 1,
			duration: hasValue ? 300 : 250,
		}),
	]).start();
};

function VerifyPhoneNumberScreen(props) {
	// console.log(70, props.infos);

	const [
		createCodeConfirm,
		{
			error: errorCode,
			called: calledCode,
			loading: loadingCode,
			data: dataCode,
		},
	] = useMutation(MUTATION_CREATE_CODE_CONFIRM, {
		onCompleted: (dataCode) => {
			console.log(dataCode);
			console.log(44, dataCode.insert_user_confirm_code.returning[0].id);

			if (dataCode.insert_user_confirm_code.returning[0].id != null) {
				console.log("just call");

				let phone = "84" + props.infos.phone.substring(1);

				console.log("phone: " + phone);

				SMS.send({
					message:
						dataCode.insert_user_confirm_code.returning[0].code +
						" la ma xac minh dang ky Baotrixemay cua ban",
					phone: phone,
				})
					.then((response) => {
						console.log("response");
						console.log(response);
					})
					.catch((error) => {
						console.log("error");
						console.log(error);
					})
					.finally(() => {
						console.log("finally");
					});
			} else {
				console.log("false id");
			}
		},
		onError: (errorCode) => {
			Alert.alert("Có lỗi xảy ra!");

			console.log("onError");
			console.log(errorCode);
		},
	});

	const [
		checkCodeConfirm,
		{
			error: errorConfirm,
			called: calledConfirm,
			loading: loadingConfirm,
			data: dataConfirm,
		},
	] = useLazyQuery(QUERY_CHECK_CODE_CONFIRM, {
		onCompleted: (dataConfirm) => {
			console.log("checkCodeConfirm");
			console.log(125, dataConfirm);

			if (dataConfirm.user_confirm_code[0].id) {
				activeUser({
					variables: { uid: dataConfirm.user_confirm_code[0].uid },
				});
			} else {
				setLoading(false);

				setTimeout(function () {
					Alert.alert("Có lỗi xảy ra");
				}, 700);
			}
		},
		onError: (errorConfirm) => {
			setLoading(false);

			setTimeout(function () {
				Alert.alert("Có lỗi xảy ra");
			}, 700);
			console.log("onError");
			console.log(errorConfirm);
		},
	});

	const [
		activeUser,
		{
			error: errorActive,
			called: calledActive,
			loading: loadingActive,
			data: dataActive,
		},
	] = useMutation(MUTATION_ACTIVE_USER, {
		onCompleted: (dataActive) => {
			setLoading(false);

			if (dataActive.update_users.returning[0].id != null) {
				console.log("done confirm");

				saveUserdata(dataActive.update_users.returning[0], props);

				setTimeout(() => {
					Alert.alert("Đã xác thực tài khoản");
				}, 800);
				props.navigation.navigate("More");
			} else {
				setTimeout(function () {
					Alert.alert("Có lỗi xảy ra");
				}, 700);
			}
		},
		onError: (errorConfirm) => {
			setLoading(false);
			setTimeout(function () {
				Alert.alert("Có lỗi xảy ra");
			}, 700);

			Alert.alert("Có lỗi xảy ra!");
			console.log("onError");
			console.log(errorActive);
		},
	});

	const [lastedSent, setLastestSent] = useState(null);
	const [countSMS, setCountSMS] = useState(0);
	const [codeConfirm, setCodeConfirm] = useState("");
	const [isSent, setIsSent] = useState(false);
	const [value, setValue] = useState("");
	const [loading, setLoading] = useState(false);

	const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
	const [propsX, getCellOnLayoutHandler] = useClearByFocusCell({
		value,
		setValue,
	});

	const [timeLeft, setTimeLeft] = useState(60);

	useEffect(() => {
		// onCreateCodeConfirm();
		// const timer = setTimeout(() => {
		// 	let timeNew;
		// 	if (timeLeft > 0) {
		// 		timeNew = timeLeft - 1;
		// 	} else {
		// 		timeNew = timeLeft;
		// 	}
		// 	setTimeLeft(timeNew);
		// }, 1000);
		// if (props.infos.is_actived == 0) {
		// 	onCreateCodeConfirm();
		// }

		if (!props.infos) {
			directForNonAuth(props);
		} else {
			if (props.infos.is_actived != 0) {
				props.navigation.navigate("More");
			} else {
				onCreateCodeConfirm();
			}
		}
	});

	// function calculateTimeLeft() {

	// 	if (timeLeft > 0) {
	// 		set
	// 	}

	// 	return timeLeft - 1
	// }

	function onCreateCodeConfirm() {
		getDataFromStorage("@lasted_verity_phone_time")
			.then((lastest) => {
				if (
					lastest == null ||
					Math.floor(Date.now() / 1000) - parseInt(lastest) > 179
				) {
					setDataStorage(
						"@lasted_verity_phone_time",
						Math.floor(Date.now() / 1000).toString()
					);

					console.log("run onCreateCodeConfirm");

					let randomCode = Math.floor(1000 + Math.random() * 9000);
					console.log("randomCode: " + randomCode);
					setCodeConfirm(randomCode);
					setIsSent(true);

					createCodeConfirm({
						variables: {
							code: parseInt(randomCode),
							uid: parseInt(props.infos.id),
						},
					});
				} else {
					console.log(290, lastest, Math.floor(Date.now() / 1000));
				}
			})
			.catch((error) => {
				console.log(error);
			});
	}

	function onClickCheckCode() {

		if (!value.trim()) {
			Alert.alert("Vui lòng nhập mã xác nhận");
			return;
		} else if (allNumeric(value) == false) {
			Alert.alert("Mã xác nhận không hợp lệ");
			return;
		}

		setLoading(true);

		checkCodeConfirm({
			variables: { code: parseInt(value), uid: props.infos.id },
		});
	}

	function onClickConfirm() {
		Alert.alert(
			"",
			"Mã xác nhận đã được gửi đến " + props.infos.phone,
			[
				{
					text: "Đóng",
					// onPress: () => console.log("Cancel Pressed"),
					style: "cancel",
				},
				// { text: "OK", onPress: () => console.log("OK Pressed") },
			],
			{ cancelable: false }
		);

		setTimeLeft(60);
	}

	const renderCell = ({ index, symbol, isFocused }) => {
		const hasValue = Boolean(symbol);
		const animatedCellStyle = {
			backgroundColor: animationsColor[index].interpolate({
				inputRange: [0, 1],
				outputRange: [DEFAULT_CELL_BG_COLOR, ACTIVE_CELL_BG_COLOR],
			}),
			borderRadius: animationsScale[index].interpolate({
				inputRange: [0, 1],
				outputRange: [CELL_SIZE, CELL_BORDER_RADIUS],
			}),
			transform: [
				// {
				// 	scale: animationsScale[index].interpolate({
				// 		inputRange: [0, 1],
				// 		outputRange: [0.2, 1],
				// 	}),
				// },
			],
		};

		setTimeout(() => {
			animateCell({ hasValue, index, isFocused });
		}, 0);

		return (
			<AnimatedText
				key={index}
				style={[styles.cell, animatedCellStyle]}
				onLayout={getCellOnLayoutHandler(index)}
			>
				{symbol || (isFocused ? <Cursor /> : null)}
			</AnimatedText>
		);
	};

	const renderBackAction = () => (
		<TopNavigationAction
			icon={BackIcon}
			onPress={() => props.navigation.navigate("More")}
		/>
	);

	return (
		<SafeAreaView style={styles.root}>
			<TopNavigation
				alignment="center"
				title="Xác thực tài khoản"
				accessoryLeft={renderBackAction}
				// accessoryRight={renderRightActions}
			/>
			<Divider />
			<Spinner visible={loading} />
			<View style={{ marginHorizontal: 40, marginTop: 70 }}>
				<Image style={styles.icon} source={source} />
				<Text style={styles.subTitle}>
					Nhập mã xác nhận được gửi đến điện thoại của bạn
				</Text>

				<CodeField
					ref={ref}
					{...propsX}
					value={value}
					onChangeText={setValue}
					cellCount={CELL_COUNT}
					rootStyle={styles.codeFieldRoot}
					keyboardType="number-pad"
					textContentType="oneTimeCode"
					renderCell={renderCell}
				/>

				{/*			{isSent == false && (
					<TouchableOpacity onPress={() => onCreateCodeConfirm()}>
						<View style={styles.nextButton}>
							<Text style={styles.nextButtonText}>
								Gửi mã xác nhận
							</Text>
						</View>
					</TouchableOpacity>
				)}*/}

				<TouchableOpacity onPress={() => onClickCheckCode()}>
					<View style={styles.nextButton}>
						<Text style={styles.nextButtonText}>Xác nhận</Text>
					</View>
				</TouchableOpacity>
				{/*<TouchableOpacity onPress={() => onClickConfirm()}>
					<Text
						style={
							timeLeft == 0
								? styles.resendActive
								: styles.resendInactive
						}
					>
						Gửi lại mã ({timeLeft} giây)
					</Text>
				</TouchableOpacity>*/}
			</View>
		</SafeAreaView>
	);
}

const stylesX = StyleSheet.create({
	// root: {flex: 1, padding: 20},
	// title: {textAlign: 'center', fontSize: 30},
	// codeFieldRoot: {marginTop: 30, textAlign: 'center',},
	// cell: {
	//   width: 40,
	//   height: 40,
	//   lineHeight: 38,
	//   fontSize: 24,
	//   borderWidth: 2,
	//   borderColor: '#00000030',
	//   textAlign: 'center',
	// },
	// focusCell: {
	//   borderColor: '#000',
	// },
});

function mapDispatchToProps(dispatch) {
	return {
		storeUserInfo: function (infos) {
			dispatch({ type: "saveUserInfo", infos });
		},
	};
}

function mapStateToProps(state) {
	return { infos: state.infos, token: state.token };
}

// keep this line at the end
export default connect(
	mapStateToProps,
	mapDispatchToProps
)(VerifyPhoneNumberScreen);
